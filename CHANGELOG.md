# EDM Dashboard 优化记录 — 2026年7月30-31日

测试地址: https://email-dashboard-roan.vercel.app

---

## 一、Bug 修复

### 1. 创意方案 / 智能洞察 / 灵感 — HTTP 500 错误修复

**根因**: `api/ai-handler.js` 第 52-57 行残留了 6 行孤儿代码（不属于任何函数或模板字符串），第 57 行末尾的 `` ` `` 反引号开启了一个永不关闭的模板字符串，导致 JavaScript 解析器报 `Invalid or unexpected token`，三个 AI 端点全部 500。

**影响范围**: 首页 → 创意方案（生成3个方案）、智能洞察（竞品分析）、灵感（5条参考）全部挂掉。

**修改文件**: [api/ai-handler.js](api/ai-handler.js)

#### 如何测试
1. 打开 https://email-dashboard-roan.vercel.app
2. 点击顶部导航「📢 营销活动」→ 进入 AI 创意工坊
3. 测试三个 Tab：

| Tab | 操作 | 预期结果 |
|-----|------|---------|
| 💡 创意方案 | 选择「促销活动」→ 点「生成 3 个创意方案」 | 返回 3 条 JSON，每条含 title/subject/content |
| 🧠 智能洞察 | 点「生成智能洞察」 | 返回 Markdown 分析报告（无竞品数据时友好提示） |
| 💡 灵感（在创意方案tab） | 同上操作 | 返回 5 条灵感参考 |

4. 也可以直接访问 API 验证：
   - `curl "https://email-dashboard-roan.vercel.app/api?endpoint=aiIdeas&type=促销活动"`
   - `curl "https://email-dashboard-roan.vercel.app/api?endpoint=inspire&type=促销活动"`
   - `curl "https://email-dashboard-roan.vercel.app/api?endpoint=digest"`

---

## 二、功能新增

### 2. 订阅表单页 — 4 步引导式构建器（为 EDM 小白设计）

**改动说明**: Forms 页面从纯信息展示改造为交互式逐步引导。新手跟着 4 步走，10 分钟内可以理解并完成表单设置。

**修改文件**: [src/panels/FormsPanel.jsx](src/panels/FormsPanel.jsx), [src/App.css](src/App.css)

**改动内容**:
- **4 步 Wizard**（顶部进度条）
  - Step 1: 选择表单类型（新用户弹窗 / 退出挽留 / 加购订阅）
  - Step 2-3: 每种表单类型展开详细配置指南（触发时机 → Offer设计 → 文案 → 字段 → 接入代码）
  - Step 4: 发布上线（Shopify/WordPress/Google Forms 三种接入方式）
- **设置清单可打勾** — 8 项检查项，点击打勾/取消，进度条实时更新，勾选状态保存到浏览器 localStorage（刷新不丢失）
- **常见误区改为可折叠** — 6 组错误 vs 正确做法的对比卡片

#### 如何测试
1. 点击顶部导航「📋 订阅表单」
2. **Step 1**: 看到 3 张表单类型卡片，点击任意一张（推荐「新用户订阅弹窗」）
3. **Step 2-3**: 展开的配置步骤中，点击选项标签（如「5秒」「8折」等）会推进步骤
4. **Step 4**: 看到 3 种发布方式的说明卡片
5. 回到页面下方，展开「新手设置清单」，点击编号圆圈逐项打勾
   - 刷新浏览器 → 已打勾的状态保持
6. 展开「常见误区 vs 正确做法」

---

### 3. AI 模板生成 — 英文输出 + 视觉版位预览

**改动说明**: 模板生成从中文输出改为英文，增加邮件视觉版位描述（ASCII 布局图），方便在设计工具中复现。

**修改文件**: [api/ai-handler.js](api/ai-handler.js) (`handleTemplate`, `handleCustomTemplate`)

**输出格式**:
```
## Visual Layout        ← 视觉结构描述
## Email Preview        ← ASCII 布局图 (LOGO/HERO/Headline/CTA/Footer)
## Subject Lines        ← 3 个英文标题备选
## Preview Text
## Body Copy            ← 含 [IMG: description] 图片占位符
## CTA Button           ← 文案 + 颜色
## Image Suggestions    ← 尺寸、风格、色调
## Send Recommendations
```

#### 如何测试
1. 点击「📢 营销活动」→ AI 创意工坊 → 「📝 模板生成」tab
2. 填写表单（邮件类型、活动目标、折扣、产品信息等）
3. 点击「生成完整邮件模板」
4. 返回结果应为英文，包含 Visual Layout + Email Preview + Subject Lines 等

---

### 4. AI 功能接入竞品真实数据

**改动说明**: 所有 7 个 AI 功能（创意方案/模板/灵感/评分/改写/洞察/自定义）在调用 DeepSeek 之前，先从 Google Sheets（GAS）拉取该品牌的真实竞品邮件数据，作为 AI 分析的上下文。这样 AI 给出的建议是基于真实竞品动态的，而不是泛泛的行业通识。

**修改文件**: [api/index.js](api/index.js), [api/ai-handler.js](api/ai-handler.js)

**数据注入格式**（传给 AI 的 prompt 前缀）:
```
【竞品数据上下文 — 基于该品牌真实订阅的竞品邮件】
- 已采集竞品邮件: 156 封
- 本周新增: 12 封
- 覆盖品牌数: 8 个
- 折扣覆盖率: 45%
- 邮件类型分布: {...}
- 竞品Top主题行: ...
```

如果 GAS 不可达（网络问题等），5 秒超时后自动降级为通用知识，不影响功能可用。

#### 如何测试
- 正常使用任何 AI 功能即可，后台自动注入
- 如果 GAS 数据可用，AI 建议会更精准地针对你的竞品
- API 层面验证：发送 AI 请求时，后台日志会显示竞品上下文是否加载成功

---

### 5. Dashboard 三阶段系统（前一 session 完成）

**修改文件**: [src/panels/DashboardPanel.jsx](src/panels/DashboardPanel.jsx)

| 阶段 | 标题 | 内容 |
|------|------|------|
| 🌱 阶段1 | 小白基础配置 | 3件事加粗展示、订阅表单入口、3条基础自动流程（欢迎+弃购+弃单）、新手8项检查清单 |
| 📈 阶段2 | 进阶完善 | ①扩展自动化（4条）→ ②扩展表单（退出弹窗）→ ③一键邮件方案 → 4步完成一封邮件 → Milled模板 |
| 🚀 阶段3 | 高级运营 | 本周发送计划 → 活动日历 → A/B测试 → 竞品速递 → 竞品策略建议 |

#### 如何测试
1. 打开首页，顶部有 3 个阶段按钮
2. 默认在阶段 1，看到 EDM 简介 + 3 件事
3. 点击阶段 2/3 切换查看不同内容
4. 阶段 2 的「4 步完成一封邮件」：选目标 → 去创意工坊 → 评分检查 → 排期发送

---

## 三、技术细节对照表

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `api/ai-handler.js` | Bug修复+功能 | 删除孤儿代码；模板输出改为英文 |
| `api/index.js` | 功能增强 | AI端点注入竞品数据上下文 |
| `src/panels/DashboardPanel.jsx` | 重构 | 3阶段系统、任务排序、表单折叠 |
| `src/panels/FormsPanel.jsx` | 重写 | 4步引导式表单构建器 |
| `src/panels/ScorePanel.jsx` | 保持 | AI 7维度打分 + 主题行实验室 |
| `src/panels/AIWorkshopPanel.jsx` | 优化 | 模板+自定义合并为一个Tab |
| `src/panels/SequencePanel.jsx` | 新增序列 | 弃单挽回(3封/24h)、邀评序列(2封/14d) |
| `src/App.jsx` | 重构 | AI助手全局化、Analytics精简为3Tab |
| `src/App.css` | 新增样式 | Forms Wizard、阶段系统、清单打勾等 |

---

## 四、已知限制（无需测试）

- **DeepSeek API 偶尔不稳定** — 如果返回 500 或空结果，点「重试」即可
- **竞品数据依赖 GAS 网络** — VPN 开启时才能拉到真实竞品数据；关掉 VPN 时 AI 用通用知识替代，功能不受影响
- **Milled.com 采集管线** — 脚本已写好（`scripts/scrape-milled*.js`），待填入 GAS 凭据后可测试
- **Tavily 全网搜索** — 需要注册 API Key 后配置到环境变量
