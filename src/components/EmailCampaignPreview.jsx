// 邮件活动生成器 — 邮件预览（优先渲染 emailHtml，fallback 用 copyBlocks）
export default function EmailCampaignPreview({ template, brandProfile }) {
  if (!template) return null;

  const { subjectLine, previewText, emailHtml, copyBlocks, visualDirection } = template;
  const brandName = brandProfile?.displayName || 'Brand';

  return (
    <div className="cp-preview">
      {/* 收件箱视角 */}
      <div className="cp-inbox-bar">
        <div className="cp-inbox-row">
          <span className="cp-inbox-brand">{brandName}</span>
          {visualDirection && <span className="cp-inbox-direction">{visualDirection}</span>}
        </div>
        <div className="cp-inbox-subject">{subjectLine || '(无主题行)'}</div>
        {previewText && <div className="cp-inbox-preview">{previewText}</div>}
      </div>

      {/* emailHtml 渲染 */}
      {emailHtml ? (
        <div className="cp-html-frame">
          <iframe
            srcDoc={emailHtml}
            title="email html preview"
            sandbox="allow-same-origin"
            className="cp-html-iframe"
          />
        </div>
      ) : copyBlocks ? (
        /* fallback: 用 copyBlocks 渲染简易预览 */
        <div className="cp-frame">
          <div className="cp-hero" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            {copyBlocks.heroHeadline && <h2 className="cp-hero-headline">{copyBlocks.heroHeadline}</h2>}
            {copyBlocks.subheadline && <p className="cp-hero-subheadline">{copyBlocks.subheadline}</p>}
          </div>
          {copyBlocks.offerCopy && (
            <div className="cp-offer"><div className="cp-offer-copy">{copyBlocks.offerCopy}</div></div>
          )}
          {copyBlocks.productCopy && (
            <div className="cp-product"><p className="cp-product-copy">{copyBlocks.productCopy}</p></div>
          )}
          {copyBlocks.benefitCopy && (
            <div className="cp-benefits"><div className="cp-benefit"><span className="cp-benefit-dot" style={{ background: '#f59e0b' }}>✓</span><span>{copyBlocks.benefitCopy}</span></div></div>
          )}
          {copyBlocks.ctaCopy && (
            <div className="cp-cta-block"><button className="cp-cta-btn" style={{ background: '#4f46e5' }}>{copyBlocks.ctaCopy}</button></div>
          )}
          <div className="cp-footer">{copyBlocks.footerCopy || 'Unsubscribe anytime.'}</div>
        </div>
      ) : (
        <div className="cp-empty">暂无预览内容</div>
      )}
    </div>
  );
}
