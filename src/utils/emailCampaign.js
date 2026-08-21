// 邮件活动生成器 — 表单选项、人群解释、Prompt 生成（生成可视化 EDM 提示词）

// ── 邮件类型 ──
export const CAMPAIGN_TYPES = [
  { value: 'Promotion', en: 'Promotion', zh: '促销' },
  { value: 'New Product Launch', en: 'New Product Launch', zh: '新品发布' },
  { value: 'Maintenance Reminder', en: 'Maintenance Reminder', zh: '保养提醒' },
  { value: 'Welcome Email', en: 'Welcome Email', zh: '迎新邮件' },
  { value: 'Holiday Notice', en: 'Holiday Notice', zh: '放假通知' },
  { value: 'Holiday Campaign', en: 'Holiday Campaign', zh: '节日活动' },
  { value: 'Customer Winback', en: 'Customer Winback', zh: '老客召回' },
  { value: 'Member Exclusive', en: 'Member Exclusive', zh: '会员专享' },
  { value: 'Clearance Sale', en: 'Clearance Sale', zh: '清仓折扣' },
  { value: 'Product Teaser', en: 'Product Teaser', zh: '新品预告' },
];

// ── 邮件基调 ──
export const TONES = [
  { value: 'Energetic', zh: '热情有活力' },
  { value: 'Premium', zh: '高级质感' },
  { value: 'Friendly', zh: '亲切自然' },
  { value: 'Professional', zh: '专业可信' },
  { value: 'Urgent', zh: '限时紧迫' },
  { value: 'Festive', zh: '节日氛围' },
  { value: 'Caring', zh: '关怀提醒' },
  { value: 'Sporty', zh: '赛事运动感' },
  { value: 'Tech', zh: '科技感' },
];

// ── 人群中文解释 ──
const AUDIENCE_DESC = {
  '新订阅用户': '刚订阅，还在考虑阶段，适合用优惠吸引首单',
  '高意向访客': '近期浏览过产品但还没下单，有明确购买意向',
  '加购未购买用户': '把商品加入购物车但没结账，需要再推一把',
  '历史购买用户': '买过产品，对品牌有信任，容易复购',
  '价格敏感用户': '对折扣和优惠反应积极',
  '已购买滑板车用户': '已拥有产品，需要保养和使用指导',
  '已购买滑板用户': '已拥有滑板，需要保养和使用指导',
  '购买 3-6 个月的用户': '到了常规保养周期，需要提醒',
  '注册保修用户': '还在保修期内，适合发服务提醒',
  '售后服务用户': '之前联系过客服，对服务类邮件接受度高',
  '所有活跃客户': '都需要知道放假或活动安排',
  '近期购买用户': '可能有待处理的订单',
  '有未完成订单的用户': '需要物流和配送更新',
  '咨询过客服的用户': '需要知道客服服务时间',
  'VIP 用户': '高价值客户，值得专属礼遇',
  '高互动订阅用户': '打开率高，最可能参与活动',
  '沉默客户': '90 天以上没购买或互动',
  '90 天未购买用户': '有流失风险',
  '高订单价值用户': '值得花精力召回',
  '停止阅读用户': '最近不再打开邮件',
  '忠实复购用户': '多次购买，忠诚度高',
  '有积分的会员': '积累了积分，需要提醒使用',
  '高生命周期价值用户': '值得重点维护',
  '爱淘便宜的用户': '经常在打折时购买',
  '首次购买用户': '刚下首单，欢迎并引导使用',
  '新注册账户': '注册了但还没买，引导首单',
  '预约等待用户': '已对新品表达兴趣',
  '新品预约用户': '已对新品表达兴趣',
  '社媒关注用户': '关注品牌动态',
  '对高性能产品感兴趣的用户': '关注性能和配置的发烧友',
};

export function getAudienceDesc(label) {
  return AUDIENCE_DESC[label] || '根据活动背景推荐';
}

// ── 生成 ChatGPT 提示词（要求生成高保真可视化 EDM） ──
export function buildPrompt(form, brandProfile, products, segments) {
  const { topic, type, tone, brief, offer } = form;
  const productList = products.length
    ? products.map(p => `- ${p.name}: ${p.sellingPoint}`).join('\n')
    : '- (No products selected — use generic lifestyle imagery instead)';
  const segmentList = segments.map(s => `- ${s}（${getAudienceDesc(s)}）`).join('\n');

  return `You are a Senior Ecommerce Email Designer, an EDM Art Director, and a Conversion Copywriter working for ${brandProfile.displayName}.

Your task is to create a finished, high-fidelity visual ecommerce EDM campaign — NOT a text email, NOT a wireframe, NOT a dashboard, NOT a low-fidelity prototype.

════════════════════════════════
CAMPAIGN INFORMATION
════════════════════════════════
Brand: ${brandProfile.displayName}
Category: ${brandProfile.category}
Brand tone: ${brandProfile.brandTone}
Brand visual style: ${brandProfile.visualStyle}

Campaign Topic: ${topic || '(not specified)'}
Campaign Type: ${type}
Email Tone: ${tone}
Campaign Brief: ${brief || '(not specified)'}
Offer Information: ${offer || 'No discount, announcement only'}

Products to Feature:
${productList}

Recommended Audience Segments:
${segmentList}

════════════════════════════════
CREATIVE DIRECTION
════════════════════════════════
Infer the most appropriate visual art direction from the campaign (Brand + Topic + Type + Tone + Offer + Products). Do NOT use a single fixed template for every campaign.

For example:
- "Back to School" campaign → school/campus atmosphere, youthful lifestyle imagery, promotional typography, seasonal color accents, scooter commuting scenes.
- "Black Friday" → much stronger, high-energy promotional visuals.
- "Holiday Notice" → friendlier, clearer, information-focused visual (NOT heavy promotion).
- "New Product Launch" → new-product atmosphere, strong visual impact, product highlights.
- "Maintenance Reminder" → professional, clear, service-oriented.

Different campaigns must produce different art directions.

════════════════════════════════
DESIGN REQUIREMENTS
════════════════════════════════
Create a finished, high-fidelity ecommerce EDM design. It must look like a real campaign made by a professional CRM / ecommerce design team.

It must NOT look like: a wireframe, a dashboard, a low-fidelity prototype, a collection of simple colored rectangles, a generic newsletter template, or a plain text email.

Design the email structure automatically based on Campaign Type. Choose the modules that fit, from:
- Brand Header / Logo
- Hero Campaign Visual
- Campaign Headline
- Offer / Promotion Banner
- Primary CTA
- Featured Products
- Product Selling Points
- Feature Icons
- Lifestyle Imagery
- Campaign Storytelling Section
- Community / Social Proof Section
- Secondary CTA
- Final CTA
- Ecommerce Footer

(Not every module is required — pick what fits the campaign type.)

HERO SECTION — the most important part. Design it as a real advertising campaign hero visual, combining: campaign typography, product, environment / lifestyle scene, offer, graphic elements, CTA, and brand identity. Do NOT make the hero just "headline + product + a solid color block".

PRODUCTS — only use the products listed above. Do NOT invent prices, specs, or discounts that were not provided. If some product info is missing, downplay those details visually rather than fabricating them. Product sections should look like real ecommerce merchandising, not a backend admin card.

PRODUCT IMAGE — STRICT PRESERVATION: Attached official product images are LOCKED PRODUCT ASSETS. You MUST use the supplied official product images as the actual products shown in the EDM. Do NOT redesign, regenerate, reinterpret, replace, reshape, or alter the product itself. Preserve the product's frame geometry, wheels, deck, handlebars, suspension, lights, colors, proportions, and visible components. You may adjust only placement, scale, surrounding lighting, shadows, and environmental integration when necessary to integrate the original product naturally into the campaign design. Product accuracy takes priority over visual creativity. If there is a conflict between the creative concept and preservation of the supplied product, preserve the product. Do not invent a different-looking version of the selected product.

════════════════════════════════
COPY REQUIREMENTS
════════════════════════════════
All consumer-facing email content MUST be in English. Auto-generate: Subject Line, Preheader, Hero Headline, supporting copy, CTA, section headlines, product copy, final CTA. Keep copy short, clear, and ecommerce-native. Avoid large paragraphs.

════════════════════════════════
VISUAL RICHNESS
════════════════════════════════
Use strong visual hierarchy, campaign imagery, lifestyle imagery, product presentation, typography, icons, promotional graphics, intentional spacing, and ecommerce merchandising. Do NOT solve the design primarily with text boxes and colored cards. The visual design should feel presentation-ready.

════════════════════════════════
DESKTOP + MOBILE
════════════════════════════════
Design the EDM at roughly 640-720px desktop email width. Also ensure mobile responsiveness: readable typography, product stacking, large CTA, image cropping, and proper spacing.

════════════════════════════
OUTPUT PRIORITY
════════════════════════════
The PRIMARY deliverable is the rendered visual EDM design itself.

Do NOT respond with: HTML source code only, a wireframe, a layout description, design recommendations, a text-only email, or a section-by-section written plan.

Instead, directly CREATE / RENDER / GENERATE the finished visual ecommerce EDM so the user can immediately see the final campaign design.

The result should resemble a real ecommerce EDM creative presented for design approval. It should be a complete long-form email composition, approximately 640-720px wide, containing the full visual flow from header and hero through products, campaign content, CTA and footer.

════════════════════════════════
VISUAL ASSET BEHAVIOR
════════════════════════════════
When appropriate, actively use or create visual assets rather than replacing imagery with placeholder boxes. The visual EDM should contain actual visual content such as: campaign hero imagery, product imagery, lifestyle/environment imagery, promotional graphics, icons, visual backgrounds, typography treatments, and ecommerce merchandising elements.

Do not use empty image placeholders, gray boxes, "IMAGE HERE" blocks, or wireframe-style representations.

If official product images or user-provided product images are available, prioritize them and preserve the real product appearance. If exact product imagery is unavailable, do not fabricate technical product details or misleading specifications.

════════════════════════════════
DESIGN FREEDOM
════════════════════════════════
The campaign information is a creative brief, not a rigid layout specification. Act as the Art Director and decide: overall composition, campaign color palette, visual hierarchy, section transitions, image placement, typography hierarchy, graphic motifs, product presentation style, CTA placement, and appropriate supporting sections. The final EDM should feel intentionally art-directed rather than assembled from standardized UI cards.

════════════════════════════════
THREE CREATIVE DIRECTIONS
════════════════════════════════
Generate 3 genuinely different creative directions:

Option A — Conversion Focused: stronger offer visibility, stronger CTA hierarchy and ecommerce conversion emphasis.

Option B — Brand Story / Premium: more premium art direction, stronger brand atmosphere, product quality and visual storytelling.

Option C — Campaign Theme: push the specific campaign theme and seasonal/event atmosphere further.

The three options must NOT simply be the same layout with different colors or headlines. They should have noticeably different: hero composition, visual hierarchy, section structure, imagery direction, typography treatment, and product presentation.

Generate Option A, Option B and Option C as three separate and independent EDM visual designs. Each option must be rendered as its own standalone visual output.

DO NOT place Option A, Option B and Option C together in: one image, one canvas, one comparison board, one triptych, one side-by-side presentation, or one three-column layout. DO NOT create a three-option comparison image.

Generate them separately:
- Output 1: Option A — one complete standalone EDM
- Output 2: Option B — one complete standalone EDM
- Output 3: Option C — one complete standalone EDM

Each output must contain only ONE EDM design and must be independently viewable and editable.

════════════════════════════════
STRUCTURED COPY
════════════════════════════════
Alongside each standalone visual EDM, also provide a Structured Copy in JSON format that exactly matches the consumer-facing copy actually used in that EDM visual.

The Structured Copy must include (only the fields that are actually used): subject line, preview text, hero eyebrow, hero headline, hero supporting copy, hero CTA, offer headline, offer copy, section headlines, product names, product copy, product CTA, secondary CTA, final headline, final CTA, footer copy. Omit any fields that are not used.

The Structured Copy must exactly match the copy shown in the EDM visual. Do NOT use one copy in the visual and a different copy in the Structured Copy. Its purpose is to let the user directly copy the English text without re-typing it from the image.

Use a stable machine-readable JSON format, for example:
{
  "option": "B",
  "subject_line": "...",
  "preview_text": "...",
  "sections": [
    { "type": "hero", "eyebrow": "...", "headline": "...", "body": "...", "cta": "..." },
    { "type": "offer", "headline": "...", "offer": "5% OFF", "cta": "..." },
    { "type": "product", "product_name": "KuKirin G4", "copy": "...", "cta": "..." }
  ]
}

Do NOT require the same sections for every campaign. Sections should dynamically reflect the actual generated EDM structure.

════════════════════════════════
ITERATIVE REVISION
════════════════════════════════
After generating each standalone EDM, preserve the design as a coherent visual direction that can be iteratively edited later. When the user requests a revision to a specific section, preserve all elements the user explicitly asks to keep. Do NOT redesign the entire campaign when the user only requests a local modification.

For example, the user may say: "Modify Option B's Hero Banner. Keep the moon, background, KuKirin G4, product position, overall composition and existing visual style unchanged. Change the headline to MID-AUTUMN HOLIDAY NOTICE. Make 5% OFF more prominent. Change the CTA to SHOP & SAVE 5%. Do not change anything else." In that case, only modify the specified areas and elements.

════════════════════════════════
IMPORTANT
════════════════════════════════
Visual generation and HTML production are two separate stages.

Stage 1: Campaign Brief → Prompt → 3 separate visual EDM options → select → revise → approve.

Stage 2: Approved visual → production email HTML.

Do NOT output HTML source code during the visual stage. Only after the user approves a visual direction should HTML be generated.

For each option:
1. Provide the English Subject Line and Preview Text.
2. DIRECTLY GENERATE the complete high-fidelity standalone visual EDM design.
3. Provide the matching Structured Copy JSON.

The consumer-facing EDM itself must remain entirely in English.`;
}

// ── 默认表单（输入框留空） ──
export const DEFAULT_FORM = {
  topic: '',
  type: 'Promotion',
  tone: 'Energetic',
  brief: '',
  offer: '',
};

// ── 修改 Prompt 生成器选项 ──
export const REVISION_OPTIONS = ['Option A', 'Option B', 'Option C'];
export const REVISION_SECTIONS = ['Hero Banner', 'Offer Section', 'Product Section', 'Lifestyle Section', 'CTA Section', 'Footer', 'Other'];

// ── 生成局部修改 Prompt（固定模板） ──
export function buildRevisionPrompt(option, section, keep, changes) {
  return `Please modify the existing **Option ${option} — ${section}** only.

## KEEP UNCHANGED

Keep the following elements exactly as they are:

${keep || '(keep everything else unchanged)'}

If official product images were provided, preserve the product itself exactly.

Do not redesign, regenerate, replace, reshape, reinterpret, or alter the product.

## CHANGES

Make ONLY the following changes:

${changes}

## STRICT REVISION RULE

This is a LOCAL REVISION of the existing EDM design, NOT a new campaign generation.

Do NOT redesign the entire EDM.

Do NOT generate a new campaign from scratch.

Do NOT change any element that I did not explicitly ask you to change.

Preserve the existing:

* overall visual direction
* composition
* design language
* product appearance
* surrounding sections

Only modify the requested section and requested elements.

All other parts of the current EDM must remain unchanged.`;
}
