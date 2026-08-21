import { useState, useEffect, useCallback } from 'react';

// 我的竞品邮件截图：固定高度预览框 + 大图 modal
export default function EmailReferences({ images = [] }) {
  const [modal, setModal] = useState(null);
  const [failedImages, setFailedImages] = useState({});

  const closeModal = useCallback(() => setModal(null), []);

  // Esc 关闭 modal
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  if (!images || images.length === 0) {
    return (
      <div className="ref-empty">
        暂无截图，把图片放到 public/email-templates/ 并按 1.1、1.2 这种规则命名即可。
      </div>
    );
  }

  const markFailed = (src) => setFailedImages(s => ({ ...s, [src]: true }));

  return (
    <>
      <div className="ref-grid">
        {images.map((ref, i) => (
          <div key={i} className="ref-card">
            <div className="ref-preview" onClick={() => setModal(ref)} title="点击查看大图">
              {failedImages[ref.image] ? (
                <div className="ref-missing">图片未找到，请检查 public/email-templates 文件名。</div>
              ) : (
                <img src={ref.image} alt={ref.label} loading="lazy" onError={() => markFailed(ref.image)} />
              )}
              <div className="ref-fade" />
            </div>
            <div className="ref-footer">
              <span className="ref-label">{ref.label}</span>
              <button className="ref-view-btn" onClick={() => setModal(ref)}>查看大图</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="ref-modal-overlay" onClick={closeModal}>
          <div className="ref-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-head">
              <strong>{modal.label}</strong>
              {modal.note && <span>{modal.note}</span>}
              <button className="ref-modal-close" aria-label="关闭" onClick={closeModal}>✕</button>
            </div>
            <div className="ref-modal-body">
              <img src={modal.image} alt={modal.label} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
