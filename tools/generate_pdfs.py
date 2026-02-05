#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
生成可打印 PDF（A4）：
- 教学大纲（docs/教学大纲.md → output/教学大纲.pdf）
- 10 份教案（docs/教案/*.md → output/教案-第XX课.pdf）
- 每课练习 + 答案（data/题库/lesson-XX.json → output/lesson-XX-练习.pdf / output/lesson-XX-答案.pdf）

实现说明（中文注释）：
- 这里不引入 reportlab 等 Python 依赖，改用本机已安装的 pandoc + xelatex。
- 题库用 JSON 维护，避免“题目/答案/PDF”三份内容不一致。
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
PLANS_DIR = DOCS_DIR / "教案"
BANK_DIR = ROOT / "data" / "题库"
OUT_DIR = ROOT / "output"
OUT_MD_DIR = OUT_DIR / "_md"
PANDOC_HEADER_TEX = ROOT / "tools" / "pandoc_header.tex"


DEFAULT_FONT = "PingFang SC"  # macOS 自带中文字体（若你改系统字体，可在命令行覆盖）
DEFAULT_MONO_FONT = "Menlo"  # 常见 macOS 等宽字体，符号覆盖较全


def _run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"命令执行失败：\n{' '.join(cmd)}\n\n输出：\n{proc.stdout}")


def _require_tools() -> None:
    for tool in ["pandoc", "xelatex"]:
        if not shutil_which(tool):
            raise RuntimeError(f"未找到 {tool}，请先安装/配置后再生成 PDF。")

def _require_merge_tool() -> str:
    # 合并 PDF 用：优先 mutool，其次 gs，再次 pdfunite（都没有则报错）。
    for tool in ["mutool", "gs", "pdfunite"]:
        if shutil_which(tool):
            return tool
    raise RuntimeError("未找到 PDF 合并工具（mutool / gs / pdfunite）。请先安装其中任意一个。")


def shutil_which(cmd: str) -> str | None:
    # 轻量替代 shutil.which（避免额外 import）
    for p in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(p) / cmd
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def pandoc_md_to_pdf(md_path: Path, pdf_path: Path, *, font: str, mono_font: str) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "pandoc",
        str(md_path),
        "-o",
        str(pdf_path),
        "--pdf-engine=xelatex",
        "-H",
        str(PANDOC_HEADER_TEX),
        "-V",
        "papersize=a4",
        "-V",
        "geometry:margin=2cm",
        "-V",
        "fontsize=12pt",
        "-V",
        f"mainfont={font}",
        "-V",
        f"CJKmainfont={font}",
        "-V",
        f"monofont={mono_font}",
        "-V",
        "links-as-notes=true",
    ]
    _run(cmd)


def _sanitize_md_text(s: str) -> str:
    # 保护 markdown：避免 JSON 里出现的特殊字符导致格式乱掉
    s = s.replace("\r\n", "\n")
    return s


def _md_escape_inline(s: str) -> str:
    # 只做最必要的转义
    s = s.replace("\\", "\\\\")
    s = s.replace("_", "\\_")
    return s


@dataclass
class Lesson:
    lesson: int
    title: str
    number_system: str
    sections: list[dict[str, Any]]


def load_lesson(path: Path) -> Lesson:
    data = json.loads(path.read_text(encoding="utf-8"))
    return Lesson(
        lesson=int(data["lesson"]),
        title=str(data["title"]),
        number_system=str(data.get("number_system", "")),
        sections=list(data["sections"]),
    )


def _lesson_prefix(n: int) -> str:
    return f"{n:02d}"


def lesson_to_exercise_md(lesson: Lesson) -> str:
    lines: list[str] = []
    lines.append(f"# 第 {lesson.lesson:02d} 课 练习题：{lesson.title}")
    if lesson.number_system:
        lines.append(f"> 约束：{lesson.number_system}")
    lines.append("")
    lines.append("**提示：** 每道题尽量写出“对两边做了什么”。把“代回检验”当作通关/开锁环节：检验通过才算完成 ✓")
    lines.append("")

    def workspace_lines(item_type: str | None) -> list[str]:
        # 只决定“留白多少”，不影响题目内容；方便打印手写。
        t = (item_type or "").strip()
        if t == "fill_blank":
            return ["   答：______________________________"]
        if t in {"solve", "quadratic"}:
            return [
                "   步骤：______________________________",
                "        ______________________________",
                "        ______________________________",
                "   检验：______________________________",
            ]
        if t in {"word", "system", "table", "plot", "graph_task", "open", "create", "list_pairs", "no_solution"}:
            return [
                "   步骤：______________________________",
                "        ______________________________",
                "        ______________________________",
                "        ______________________________",
                "        ______________________________",
                "   检验/说明：__________________________",
            ]
        # reason / check_step / compare / check_pair / meaning / judge / choose 等
        return [
            "   说明：______________________________",
            "        ______________________________",
        ]

    q_idx = 1
    for sec in lesson.sections:
        lines.append(f"## {sec.get('name','')}".strip())
        lines.append("")
        for item in sec.get("items", []):
            prompt = _sanitize_md_text(str(item.get("prompt", ""))).strip()
            prompt = prompt.replace("\n", "\n\n")  # 更易读
            lines.append(f"{q_idx}. （{_md_escape_inline(str(item.get('id','')))}）{prompt}")
            lines.append("")
            # 留出手写空间（按题型给不同留白）
            lines.extend(workspace_lines(item.get("type")))
            lines.append("")
            q_idx += 1

    return "\n".join(lines).rstrip() + "\n"


def lesson_to_answer_md(lesson: Lesson) -> str:
    lines: list[str] = []
    lines.append(f"# 第 {lesson.lesson:02d} 课 答案与解析：{lesson.title}")
    if lesson.number_system:
        lines.append(f"> 约束：{lesson.number_system}")
    lines.append("")

    q_idx = 1
    for sec in lesson.sections:
        lines.append(f"## {sec.get('name','')}".strip())
        lines.append("")
        for item in sec.get("items", []):
            prompt = _sanitize_md_text(str(item.get("prompt", ""))).strip()
            prompt = prompt.replace("\n", "\n\n")
            answer = _sanitize_md_text(str(item.get("answer", ""))).strip()
            solution = item.get("solution", [])

            lines.append(f"{q_idx}. （{_md_escape_inline(str(item.get('id','')))}）{prompt}")
            lines.append("")
            lines.append(f"   **答案：** {answer}")
            if isinstance(solution, list) and solution:
                lines.append("")
                lines.append("   **解析：**")
                for step in solution:
                    step_s = _sanitize_md_text(str(step)).strip()
                    lines.append(f"   - {step_s}")
            lines.append("")
            q_idx += 1

    return "\n".join(lines).rstrip() + "\n"


def generate_docs_pdfs(font: str, mono_font: str) -> None:
    # 教学大纲
    outline_md = DOCS_DIR / "教学大纲.md"
    if outline_md.exists():
        pandoc_md_to_pdf(outline_md, OUT_DIR / "教学大纲.pdf", font=font, mono_font=mono_font)

    # 教案（每课一份）
    for md in sorted(PLANS_DIR.glob("第*课-*.md")):
        # 规范输出名：教案-第01课.pdf
        m = re.search(r"第(\d+)\s*课", md.stem)
        if not m:
            continue
        n = int(m.group(1))
        out_pdf = OUT_DIR / f"教案-第{_lesson_prefix(n)}课.pdf"
        pandoc_md_to_pdf(md, out_pdf, font=font, mono_font=mono_font)


def generate_lesson_pdfs(lesson_num: int | None, font: str, mono_font: str) -> None:
    OUT_MD_DIR.mkdir(parents=True, exist_ok=True)

    lesson_files = sorted(BANK_DIR.glob("lesson-*.json"))
    if lesson_num is not None:
        lesson_files = [p for p in lesson_files if re.search(rf"lesson-{lesson_num:02d}\.json$", p.name)]

    if not lesson_files:
        raise RuntimeError("未找到题库 JSON（data/题库/lesson-XX.json）。")

    for path in lesson_files:
        lesson = load_lesson(path)
        n = _lesson_prefix(lesson.lesson)

        ex_md_path = OUT_MD_DIR / f"lesson-{n}-练习.md"
        ans_md_path = OUT_MD_DIR / f"lesson-{n}-答案.md"

        ex_md_path.write_text(lesson_to_exercise_md(lesson), encoding="utf-8")
        ans_md_path.write_text(lesson_to_answer_md(lesson), encoding="utf-8")

        pandoc_md_to_pdf(ex_md_path, OUT_DIR / f"lesson-{n}-练习.pdf", font=font, mono_font=mono_font)
        pandoc_md_to_pdf(ans_md_path, OUT_DIR / f"lesson-{n}-答案.pdf", font=font, mono_font=mono_font)

def _merge_pdfs(inputs: list[Path], output_pdf: Path) -> None:
    if not inputs:
        raise RuntimeError(f"合并失败：输入 PDF 列表为空：{output_pdf.name}")
    missing = [p for p in inputs if not p.exists()]
    if missing:
        miss = "\n".join(f"- {p}" for p in missing)
        raise RuntimeError(f"合并失败：以下 PDF 不存在：\n{miss}")

    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    tool = _require_merge_tool()

    if tool == "mutool":
        cmd = ["mutool", "merge", "-o", str(output_pdf)] + [str(p) for p in inputs]
        _run(cmd)
        return
    if tool == "gs":
        cmd = ["gs", "-dBATCH", "-dNOPAUSE", "-q", "-sDEVICE=pdfwrite", f"-sOutputFile={output_pdf}"] + [str(p) for p in inputs]
        _run(cmd)
        return
    if tool == "pdfunite":
        cmd = ["pdfunite"] + [str(p) for p in inputs] + [str(output_pdf)]
        _run(cmd)
        return

    raise RuntimeError(f"未知的合并工具：{tool}")


def _pack_cover_md(*, kind: str) -> str:
    # kind: teacher | student
    today = datetime.date.today().isoformat()
    if kind == "teacher":
        return (
            "# 教师材料（完整版）\n\n"
            "## 三年级方程（10 次 × 30 分钟｜一对一）\n\n"
            f"- 生成日期：{today}\n"
            "- 用途：老师备课 + 课堂参考（含大纲/教案/练习/答案）\n\n"
            "### 内容清单\n\n"
            "1. 教学大纲\n"
            "2. 10 份教案（第 01–10 课）\n"
            "3. 10 课练习题（可打印留白版）\n"
            "4. 10 课答案与解析（含“开锁检验 ✓/✗”）\n\n"
            "### 课堂口令（请反复用）\n\n"
            "> 两边做同一件事，等号才不变。\n\n"
            "### 提醒\n\n"
            "- 主线：正整数 + 0\n"
            "- 分数拓展：少量 1/2、1/4（第 9–10 课）\n"
            "- 负数：全套仅 3 题，均标注“挑战可跳过”\n"
        )

    if kind == "student":
        return (
            "# 学生材料（练习册）\n\n"
            "## 三年级方程（10 次 × 30 分钟｜一对一）\n\n"
            f"- 生成日期：{today}\n"
            "- 用途：学生练习与订正（不含答案）\n\n"
            "### 做题规则（写在第一页就够）\n\n"
            "1. 每一步都写清：**对两边做了什么**。\n"
            "2. 做完必须“开锁检验”：把答案代回去，看左右是否一样 ✓。\n\n"
            "### 提醒\n\n"
            "- 主线：正整数 + 0\n"
            "- 分数拓展：少量 1/2、1/4（最后两课）\n"
            "- 挑战题（负数）可以跳过\n"
        )

    raise RuntimeError(f"未知封面类型：{kind}")


def generate_pack_pdfs(font: str, mono_font: str) -> None:
    """
    生成两份“合订本”PDF（便于分别打印）：
    - output/教师材料-完整版.pdf：大纲 + 10教案 + 10课练习 + 10课答案
    - output/学生材料-完整版.pdf：10课练习（不含答案）
    """
    OUT_MD_DIR.mkdir(parents=True, exist_ok=True)

    # 封面
    teacher_cover_md = OUT_MD_DIR / "教师材料-封面.md"
    student_cover_md = OUT_MD_DIR / "学生材料-封面.md"
    teacher_cover_md.write_text(_pack_cover_md(kind="teacher"), encoding="utf-8")
    student_cover_md.write_text(_pack_cover_md(kind="student"), encoding="utf-8")

    teacher_cover_pdf = OUT_DIR / "教师材料-封面.pdf"
    student_cover_pdf = OUT_DIR / "学生材料-封面.pdf"
    pandoc_md_to_pdf(teacher_cover_md, teacher_cover_pdf, font=font, mono_font=mono_font)
    pandoc_md_to_pdf(student_cover_md, student_cover_pdf, font=font, mono_font=mono_font)

    outline_pdf = OUT_DIR / "教学大纲.pdf"
    plan_pdfs = sorted(OUT_DIR.glob("教案-第*课.pdf"))
    exercise_pdfs = sorted(OUT_DIR.glob("lesson-*-练习.pdf"))
    answer_pdfs = sorted(OUT_DIR.glob("lesson-*-答案.pdf"))

    teacher_inputs = [teacher_cover_pdf, outline_pdf] + plan_pdfs + exercise_pdfs + answer_pdfs
    student_inputs = [student_cover_pdf] + exercise_pdfs

    _merge_pdfs(teacher_inputs, OUT_DIR / "教师材料-完整版.pdf")
    _merge_pdfs(student_inputs, OUT_DIR / "学生材料-完整版.pdf")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Generate A4 PDFs for lessons + docs (pandoc + xelatex).")
    ap.add_argument("--all", action="store_true", help="生成：大纲/教案 + 10 课练习/答案")
    ap.add_argument("--docs", action="store_true", help="只生成：教学大纲/教案 PDF")
    ap.add_argument("--lessons", action="store_true", help="只生成：练习/答案 PDF（默认全课）")
    ap.add_argument("--packs", action="store_true", help="生成：教师/学生合订本 PDF（会先生成 docs + lessons）")
    ap.add_argument("--lesson", type=int, default=None, help="只生成某一课（例如 8）")
    ap.add_argument("--font", type=str, default=DEFAULT_FONT, help="中文字体名（默认 PingFang SC）")
    ap.add_argument("--monofont", type=str, default=DEFAULT_MONO_FONT, help="等宽字体名（默认 Menlo）")
    args = ap.parse_args(argv)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    _require_tools()

    # 兜底：如果没传任何开关，等同于 --all
    if not any([args.all, args.docs, args.lessons, args.packs]) and args.lesson is None:
        args.all = True

    if args.all or args.docs or args.packs:
        generate_docs_pdfs(font=args.font, mono_font=args.monofont)

    if args.all or args.lessons or args.lesson is not None or args.packs:
        generate_lesson_pdfs(args.lesson, font=args.font, mono_font=args.monofont)

    if args.all or args.packs:
        generate_pack_pdfs(font=args.font, mono_font=args.monofont)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
