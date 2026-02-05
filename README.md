# 方程教学（10 次 × 30 分钟，一对一）

本目录包含：

- 10 次课的**教学大纲**与**教案**（Markdown + 可打印 PDF）
- 每次课的**练习题**与**答案**（可打印 PDF）
- 一份可互动的**网页版教学课件**（含 GeoGebra JS API：二元一次方程组图像演示）

## 快速开始

### 1) 打开网页课件

在本目录执行：

```bash
python -m http.server 8000
```

然后用 Chrome 打开：

```text
http://localhost:8000/web/
```

说明：
- GeoGebra 组件会从网络加载资源（需要联网）。
- 上课建议直接打开对应“分页面”（避免一页里有太多内容分心）：
  - `http://localhost:8000/web/lessons/balance.html`（第 01–06 课：天平解方程）
  - `http://localhost:8000/web/lessons/systems.html`（第 07–08 课：交点 = 解，GeoGebra）
  - `http://localhost:8000/web/lessons/square.html`（第 09 课：平方 = 面积）
- 备课用全功能单页：`http://localhost:8000/web/all-in-one.html`

### 2) 生成所有 PDF（A4）

```bash
python tools/generate_pdfs.py --all
```

生成结果在 `output/`：
- `output/教学大纲.pdf`
- `output/教案-第01课.pdf` … `output/教案-第10课.pdf`
- `output/lesson-01-练习.pdf` … `output/lesson-10-练习.pdf`
- `output/lesson-01-答案.pdf` … `output/lesson-10-答案.pdf`
- 合订本（方便分别打印）：
  - `output/教师材料-完整版.pdf`（大纲 + 教案 + 练习 + 答案）
  - `output/学生材料-完整版.pdf`（练习册，不含答案）

依赖：
- macOS 已安装：`pandoc`、`xelatex`（本机已检测到可用）

## 目录结构

```text
docs/
  教学大纲.md
  教案/
    第01课-等号与未知数.md
    ...
data/
  题库/
    lesson-01.json
    ...
tools/
  generate_pdfs.py
web/
  index.html
  all-in-one.html
  style.css
  app.js
  lessons/
    balance.html
    systems.html
    square.html
  widgets/
    balance-solver.js
    area-square.js
    systems-geogebra.js
output/
  （自动生成的 PDF 与中间产物）
```

## 使用建议（给老师）

- 主线坚持一句口令：**两边做同一件事，等号才不变**。
- 每节课都做一次“代回检验”（把“会做题”拉到“懂原理”）。
- 二元一次方程组建议用“表格 → 点 → 线 → 交点”的顺序，再用 GeoGebra 做可视化验证。

## 部署到 GitHub Pages（可选）

本项目的网页课件是**纯静态 HTML/CSS/JS**，可以直接部署到 GitHub Pages。

已内置 GitHub Actions 工作流：`.github/workflows/pages.yml`（会把 `web/` 作为站点根目录发布）。

步骤：
1) 在 GitHub 新建一个仓库，把本目录推上去（默认分支建议用 `main`）。
2) 打开仓库 Settings → Pages：
   - Build and deployment → Source 选择 **GitHub Actions**
3) 之后每次 push 到 `main`，Pages 会自动更新。

部署成功后访问：
- `https://<你的用户名>.github.io/<仓库名>/`
