// Email Strategy Tool — Generator
// Ported from email-strategy/generator.py

import {
  BRANDS, ENGAGEMENT_TIERS, SEQUENCE_TEMPLATES,
  SUBJECT_LINE_FORMULAS, BODY_FRAMEWORKS,
  VISUAL_ARCHETYPES, COLOR_STRATEGIES,
  TYPOGRAPHY_RULES, CTA_RULES, COPY_CHECKLIST,
  COMPLIANCE_RULES, DESIGN_FORBIDDEN, IMAGE_RULES,
  FOOTER_REQUIREMENTS,
} from './knowledge.js';

function brandName(brandKey, customConfig) {
  if (brandKey === "custom" && customConfig) return customConfig.name || "自定义品牌";
  return (BRANDS[brandKey] && BRANDS[brandKey].name) || brandKey;
}

function now() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

// ============================================================
// Phase 1: Strategy
// ============================================================

export function generateStrategyMarkdown(brandKey, customConfig, selectedTiers, targetCtr, targetCtor, notes) {
  const brand = BRANDS[brandKey] || BRANDS["custom"];
  const name = brandName(brandKey, customConfig);
  if (!selectedTiers) selectedTiers = [1, 2, 3];

  const lines = [
    `## Email 策略: ${name}`,
    `*生成时间: ${now()}*`,
    "",
    "### 品牌概况",
    `- **品牌**: ${name}`,
    `- **品类**: ${brand.category || "—"}`,
    `- **推荐语调**: ${brand.tone || "—"}`,
    `- **推荐设计原型**: ${brand.recommended_archetype || "Editorial"}`,
    "",
    "### KPI 目标",
    "",
  ];
  if (targetCtr) lines.push(`- **目标 CTR**: ${targetCtr}%`);
  if (targetCtor) lines.push(`- **目标 CTOR**: ${targetCtor}%`);
  lines.push("");

  lines.push("### 人群分层发送策略", "");
  lines.push("| Tier | 条件 | 发送比例 | 策略 |");
  lines.push("|------|------|----------|------|");
  for (const t of ENGAGEMENT_TIERS) {
    const active = selectedTiers.includes(t.tier) ? "✅" : "❌";
    lines.push(`| ${t.tier} ${active} | ${t.condition} | ${t.send_ratio} | ${t.action} |`);
  }
  lines.push("");

  lines.push("### 合规要点", "");
  for (const r of COMPLIANCE_RULES.slice(0, 4)) {
    lines.push(`- [ ] ${r}`);
  }
  lines.push("");

  if (notes) lines.push(`### 备注\n${notes}\n`);

  return lines.join("\n");
}

// ============================================================
// Phase 2: Sequence
// ============================================================

export function generateSequenceMarkdown(sequenceType, brandKey, customConfig, emailCount, customNotes) {
  const name = brandName(brandKey, customConfig);
  let template = SEQUENCE_TEMPLATES[sequenceType] || [];
  if (!template.length) return `## Sequence: ${sequenceType}\n\n*模板未找到*`;

  if (emailCount) template = template.slice(0, emailCount);

  const lines = [
    `## Sequence: ${sequenceType} — ${name}`,
    `*生成时间: ${now()}*`,
    "",
    "### 序列概览",
    `- **类型**: ${sequenceType}`,
    `- **邮件数**: ${template.length}`,
    `- **品牌**: ${name}`,
    "",
    "### 邮件排期",
    "",
    "| # | 时间 | 目的 | 主题行方向 |",
    "|---|------|------|-----------|",
  ];

  for (const email of template) {
    const subject = email.subject_hint.replace("{brand}", name).replace("{N}", "1000");
    lines.push(`| ${email.num} | ${email.timing} | ${email.purpose} | ${subject} |`);
  }
  lines.push("");

  if (sequenceType === "弃购挽回") {
    lines.push("> **黄金法则**: 首封邮件不打折。先提醒 → 解决顾虑 → 最后才给激励。");
    lines.push("");
  } else if (sequenceType === "售后序列") {
    lines.push("> **跨境特需**: 国际物流 7-20 天，在 Day 7-10 邮件中加物流焦虑安抚内容。Day 21-30 嵌入 Trustpilot 评价请求。");
    lines.push("");
  }

  if (customNotes) lines.push(`### 自定义备注\n${customNotes}\n`);

  return lines.join("\n");
}

// ============================================================
// Phase 3: Copy
// ============================================================

export function generateCopyMarkdown(brandKey, customConfig, selectedFormulas, bodyFramework, ctaStyle, brandKeywords, customNotes) {
  const name = brandName(brandKey, customConfig);
  const brand = BRANDS[brandKey] || BRANDS["custom"];
  if (!selectedFormulas) selectedFormulas = ["好奇", "直接"];
  if (!brandKeywords) brandKeywords = brand.keywords || [];

  const lines = [
    `## 文案指南: ${name}`,
    `*生成时间: ${now()}*`,
    "",
    "### 推荐主题行公式",
    "",
  ];

  for (const f of SUBJECT_LINE_FORMULAS) {
    if (selectedFormulas.includes(f.name_cn)) {
      let example = f.example;
      for (const kw of brandKeywords.slice(0, 2)) {
        example = example.replace("滑板", kw).replace("投影仪", kw);
      }
      lines.push(`- **${f.name_cn}** (${f.name_en}) — ${f.best_for}`);
      lines.push(`  > *示例*: "${example}"`);
      lines.push("");
    }
  }

  lines.push("### 正文框架", "");
  for (const bf of BODY_FRAMEWORKS) {
    if (bf.name === bodyFramework) {
      lines.push(`**${bf.name}** — ${bf.full}`);
      lines.push(`*最适合: ${bf.best_for}*`);
      lines.push("");
      for (const step of bf.steps) lines.push(`- ${step}`);
      lines.push("");
      break;
    }
  }

  lines.push("### CTA 策略");
  lines.push(`- 样式: **${ctaStyle}**`);
  for (const rule of CTA_RULES) lines.push(`- ${rule}`);
  lines.push("");

  if (brandKeywords.length) {
    lines.push("### 品牌关键词");
    lines.push(`> ${brandKeywords.join(", ")}`);
    lines.push("");
  }

  lines.push("### 发布前自查", "");
  for (const c of COPY_CHECKLIST) lines.push(`- [ ] ${c}`);
  lines.push("");

  if (customNotes) lines.push(`### 备注\n${customNotes}\n`);

  return lines.join("\n");
}

// ============================================================
// Phase 4: Design
// ============================================================

export function generateDesignMarkdown(archetypeName, colorStrategyName, primaryColor, brandKey, customConfig, customNotes) {
  const name = brandKey ? brandName(brandKey, customConfig) : "";
  const arch = VISUAL_ARCHETYPES.find(a => a.name === archetypeName);
  const cs = COLOR_STRATEGIES.find(c => c.name === colorStrategyName);

  const lines = [
    `## Design Brief${name ? ` — ${name}` : ''}`,
    `*生成时间: ${now()}*`,
    "",
  ];

  if (arch) {
    lines.push(
      "### 美学原型",
      `**${arch.icon} ${arch.name}**`,
      `- 适用场景: ${arch.when}`,
      `- 核心特征: ${arch.hallmarks}`,
      `- 参考品牌: ${arch.reference}`,
      ""
    );
  }

  if (cs) {
    lines.push(
      "### 色彩策略",
      `**${cs.name}** — 主色覆盖 ${cs.ratio}`,
      `- 适用: ${cs.when}`,
      `- ${cs.desc}`,
      `- 主色: \`${primaryColor}\``,
      ""
    );
  }

  const tr = TYPOGRAPHY_RULES;
  lines.push(
    "### 排版参数",
    `- 最大宽度: ${tr.max_width}`,
    `- 正文字号: ${tr.body_size}`,
    `- 标题字号: ${tr.heading_size}`,
    `- 行长: ${tr.line_length}`,
    `- 字体规则: ${tr.font_rule}`,
    `- 触摸区域: ${tr.touch_target}`,
    "",
    "### 避坑检查",
    ""
  );
  for (const rule of DESIGN_FORBIDDEN.slice(0, 8)) lines.push(`- [ ] ${rule}`);
  lines.push("");

  lines.push("### 图片规范");
  for (const r of IMAGE_RULES) lines.push(`- ${r}`);
  lines.push("");

  lines.push("### Footer 构成");
  FOOTER_REQUIREMENTS.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  lines.push("");

  if (customNotes) lines.push(`### 备注\n${customNotes}\n`);

  return lines.join("\n");
}

// ============================================================
// Email Content Generator
// ============================================================

function buildSubject(hint, formula, brandName, keywords) {
  const kw = keywords[0] || "产品";
  switch (formula) {
    case "好奇": return `这个${kw}和你想的不一样`;
    case "How-to": return `如何在10分钟内上手${kw}`;
    case "问题": return `还在为${kw}选型头疼？`;
    case "社交证明": return `1000+用户已经在用${brandName}`;
    case "紧迫": return "限时优惠还剩最后24小时";
    default: return hint.replace("{brand}", brandName).replace("{N}", "1000").slice(0, 45);
  }
}

function buildPreview(purpose, brandName) {
  const previews = {
    "提醒": `你的购物车里还有东西没结账 — ${brandName}`,
    "故事": `一个关于${brandName}如何诞生的真实故事`,
    "评价": `看看其他用户怎么说${brandName}`,
    "推荐": `为你精选了几款热门产品`,
    "召回": `好久不见，${brandName}有些新变化想告诉你`,
    "感谢": `谢谢你选择${brandName}，接下来你需要的都在这里`,
    "物流": "你的包裹正在路上，来看看物流详情",
    "评价请求": `帮${brandName}做得更好，分享你的真实体验`,
  };
  for (const [key, val] of Object.entries(previews)) {
    if (purpose.includes(key)) return val.slice(0, 90);
  }
  return `${brandName} — ${purpose.slice(0, 80)}`;
}

function brandVoice(tone, brandName, keywords) {
  const kw = keywords.slice(0, 3).join(", ") || brandName;
  const voices = {
    friendly: { greeting: "Hi there,", closing: `Talk soon,\nThe ${brandName} Team`, vibe: "像朋友间的对话，轻松自然" },
    warrior: { greeting: "Hey rider,", closing: `Ride on,\n${brandName}`, vibe: "周末户外运动语调，充满能量" },
    premium: { greeting: "Hello,", closing: `With care,\n${brandName}`, vibe: "精致、克制、不叫卖" },
    warm: { greeting: "Hi,", closing: `Stay cozy,\n${brandName}`, vibe: "温暖、科技感、家庭场景" },
  };
  return voices[tone] || voices["friendly"];
}

function buildCta(purpose, brandName) {
  if (purpose.includes("提醒") || purpose.includes("购物")) return "Finish your order";
  if (purpose.includes("故事") || purpose.includes("为什么")) return `Read the ${brandName} story`;
  if (purpose.includes("评价") || purpose.includes("社交")) return "See real reviews";
  if (purpose.includes("转化") || purpose.includes("推荐")) return "Find your match";
  if (purpose.includes("召回")) return `Come back to ${brandName}`;
  if (purpose.includes("再见")) return "Stay subscribed";
  if (purpose.includes("物流") || purpose.includes("跟踪")) return "Track your order";
  if (purpose.includes("评价请求") || purpose.includes("满意度")) return "Leave a review";
  if (purpose.includes("感谢")) return "Get started";
  if (purpose.includes("期望")) return "Manage your preferences";
  return "Learn more";
}

function designNote(emailEntry) {
  const purpose = emailEntry.purpose || "";
  if (purpose.includes("故事") || purpose.includes("品牌")) return "Founder Letter 原型 | 纯文本感 | 短段落 | 签名落款";
  if (purpose.includes("提醒")) return "Minimal Lux | 产品图 hero | 单 CTA | 不折扣色";
  if (purpose.includes("转化") || purpose.includes("推荐")) return "Editorial | 使用场景 hero | 1-2 CTA | 产品照优先";
  if (purpose.includes("召回") || purpose.includes("再见")) return "Founder Letter | 真诚直接 | 无模板铬 | 签名";
  return "Editorial | 单列 ≤600px | 移动优先 | 真实图片";
}

function buildAida(emailEntry, brandName, brandCategory, keywords, tone, ctaUrl) {
  const voice = brandVoice(tone, brandName, keywords);
  const purpose = emailEntry.purpose || "";
  const kw = keywords[0] || brandName;

  let attention;
  if (purpose.includes("提醒")) attention = "You left something behind. And it's worth coming back for.";
  else if (purpose.includes("故事") || purpose.includes("品牌")) attention = `Here's the thing about ${brandName} — we didn't start out to sell ${brandCategory}.`;
  else if (purpose.includes("评价") || purpose.includes("社交")) attention = `Don't take our word for it. Here's what real ${brandCategory} users are saying.`;
  else if (purpose.includes("转化") || purpose.includes("推荐")) attention = "You've been on our mind. And we've got something we think you'll love.";
  else if (purpose.includes("召回") || purpose.includes("再见")) attention = "It's been a minute. We wanted to check in — genuinely.";
  else if (purpose.includes("期望") || purpose.includes("预告")) attention = "Here's what's coming your way (so you're never surprised).";
  else attention = `We've been thinking about how to make ${brandCategory} better. Here's what we came up with.`;

  const interest = `If you're like most ${brandCategory} fans, you care about quality, performance, and getting it right the first time. That's exactly why we built ${brandName} the way we did.`;
  const desire = `"${brandName} changed the way I think about ${brandCategory}."\n— Actual customer (not paid, not prompted)\n\nWe hear this kind of thing a lot. Not because our marketing is clever, but because the product actually delivers.`;
  const actionCta = buildCta(purpose, brandName);

  return `${voice.greeting}\n\n${attention}\n\n${interest}\n\n${desire}\n\n[${actionCta}](${ctaUrl})\n\n${voice.closing}`;
}

function buildPas(emailEntry, brandName, brandCategory, keywords, tone, ctaUrl) {
  const voice = brandVoice(tone, brandName, keywords);
  const purpose = emailEntry.purpose || "";
  const kw = keywords[0] || brandName;

  let problem, agitate, solution;
  if (purpose.includes("提醒")) {
    problem = "You picked out something great. Then life happened. We get it.";
    agitate = "But here's the thing — stock moves fast, and your cart won't hold it forever.";
    solution = "Take 30 seconds to grab it now. Free shipping, easy returns, no risk.";
  } else if (purpose.includes("召回")) {
    problem = "You used to ride with us. Something changed.";
    agitate = "Maybe life got busy. Maybe you found something else. Either way — you're missed.";
    solution = "Come back and see what's new. We've been busy making things better.";
  } else if (purpose.includes("顾虑")) {
    problem = `Buying a ${brandCategory} online isn't a small decision.`;
    agitate = "Wrong choice = wasted money, wasted time, and a product that collects dust.";
    solution = `Here's what makes ${brandName} different — and why we back every order with a 30-day guarantee.`;
  } else {
    problem = `Let's be honest — most ${brandCategory} options out there aren't great.`;
    agitate = "They're overpriced, underperforming, or just not what you need.";
    solution = `${brandName} was built to fix exactly that.`;
  }

  const actionCta = buildCta(purpose, brandName);
  return `${voice.greeting}\n\n${problem}\n\n${agitate}\n\n${solution}\n\n[${actionCta}](${ctaUrl})\n\n${voice.closing}`;
}

function buildBab(emailEntry, brandName, brandCategory, keywords, tone, ctaUrl) {
  const voice = brandVoice(tone, brandName, keywords);
  const purpose = emailEntry.purpose || "";
  const kw = keywords[0] || brandName;

  const before = `Before I discovered ${brandName}, I was stuck.\nStuck with ${brandCategory} that didn't quite deliver. Stuck wondering if I'd made the right call. Stuck explaining to friends why it was 'fine, I guess.'`;
  const after = `After switching to ${brandName}, things changed.\nNot overnight. But noticeably. The difference between 'fine' and 'actually great.'`;
  const bridge = `That's the gap ${brandName} fills. Not with marketing hype — with better engineering, better materials, and a team that genuinely cares about ${brandCategory}.`;
  const actionCta = buildCta(purpose, brandName);

  return `${voice.greeting}\n\n${before}\n\n${after}\n\n${bridge}\n\n[${actionCta}](${ctaUrl})\n\n${voice.closing}`;
}

export function generateEmailContent(emailEntry, brandName, brandCategory, subjectFormula, bodyFramework, keywords, tone, ctaUrl) {
  if (!keywords) keywords = [];
  const purpose = emailEntry.purpose || "";
  const subjectHint = emailEntry.subject_hint || "";

  const subject = buildSubject(subjectHint, subjectFormula, brandName, keywords).slice(0, 45);
  const preview = buildPreview(purpose, brandName);

  let body;
  if (bodyFramework === "AIDA") body = buildAida(emailEntry, brandName, brandCategory, keywords, tone, ctaUrl);
  else if (bodyFramework === "PAS") body = buildPas(emailEntry, brandName, brandCategory, keywords, tone, ctaUrl);
  else body = buildBab(emailEntry, brandName, brandCategory, keywords, tone, ctaUrl);

  const cta = buildCta(purpose, brandName);

  return {
    subject,
    preview,
    body,
    cta,
    design_note: designNote(emailEntry),
  };
}

export function generateSequenceEmails(sequenceType, brandKey, customConfig, emailCount, subjectFormula, bodyFramework, tone, keywords, ctaUrl) {
  const brand = BRANDS[brandKey] || BRANDS["custom"];
  const name = brand.name || "Brand";
  const category = brand.category || "";
  if (!keywords) keywords = brand.keywords || [];

  let template = SEQUENCE_TEMPLATES[sequenceType] || [];
  if (emailCount) template = template.slice(0, emailCount);

  const formulaNames = SUBJECT_LINE_FORMULAS.map(f => f.name_cn);
  const emails = [];

  template.forEach((entry, i) => {
    let formula;
    if (i === 0) formula = "直接";
    else if (i === 1) formula = "好奇";
    else if (i === template.length - 1) formula = sequenceType === "弃购挽回" ? "紧迫" : "直接";
    else formula = formulaNames[(i * 2) % formulaNames.length];

    const email = generateEmailContent(entry, name, category, formula, bodyFramework, keywords, tone, ctaUrl);
    email.num = entry.num;
    email.timing = entry.timing;
    email.purpose = entry.purpose;
    emails.push(email);
  });

  return emails;
}

export function generateFullStrategy(brandKey, customConfig, phase1Md, phase2Md, phase3Md, phase4Md) {
  const name = brandName(brandKey, customConfig);
  const parts = [
    `# Email Strategy: ${name}`,
    `*完整方案 · 生成于 ${now()}*`,
    "",
    "---",
    "",
  ];

  if (phase1Md) { parts.push(phase1Md); parts.push("", "---", ""); }
  if (phase2Md) { parts.push(phase2Md); parts.push("", "---", ""); }
  if (phase3Md) { parts.push(phase3Md); parts.push("", "---", ""); }
  if (phase4Md) { parts.push(phase4Md); parts.push("", "---", ""); }

  parts.push(
    "## 跨境电商 DTC 特别提示",
    "",
    "- **物流焦虑**: 售后序列拉长（国际物流 7-20 天），中间插入在途安抚邮件",
    "- **评价收集**: Day 21-30 嵌入 Trustpilot 评价请求",
    "- **时区发送**: 主力市场 EST/PDT + CET 早上",
    "- **多语言**: 关键节点（Welcome #1, Post-purchase）加中文版本"
  );

  return parts.join("\n");
}
