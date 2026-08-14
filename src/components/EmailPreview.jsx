import { useState, useMemo } from 'react';

const MOBILE_W = 375;
const DESKTOP_W = 620;
const GMAIL_SUBJECT_CUTOFF = 33;

const EMAIL_WRAPPER = (body, subject) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1e293b;padding:16px;margin:0}
  img{max-width:100%;height:auto}
  a{color:#4f46e5}
  h1,h2,h3{color:#0f172a}
  table{border-collapse:collapse;width:100%}
</style></head>
<body>${body || '<p style="color:#94a3b8">(无内容)</p>'}</body>
</html>`;

export default function EmailPreview({ subject, body, preheader, compact }) {
  const [view, setView] = useState('mobile');

  const width = view === 'mobile' ? MOBILE_W : DESKTOP_W;

  const subjectDisplay = useMemo(() => {
    if (!subject) return null;
    const short = subject.slice(0, GMAIL_SUBJECT_CUTOFF);
    const rest = subject.slice(GMAIL_SUBJECT_CUTOFF);
    return { short, rest, clipped: subject.length > GMAIL_SUBJECT_CUTOFF };
  }, [subject]);

  const html = useMemo(() => EMAIL_WRAPPER(body, subject), [body, subject]);

  if (!body && !subject) return null;

  if (compact) {
    return (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>预览</span>
          <button
            onClick={() => setView(v => v === 'mobile' ? 'desktop' : 'mobile')}
            style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            {view === 'mobile' ? '📱 手机' : '🖥️ 桌面'} ({view === 'mobile' ? '375px' : '620px'})
          </button>
        </div>
        <div style={{
          width: width + 'px',
          maxWidth: '100%',
          margin: '0 auto',
          border: '2px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          transition: 'width .25s',
        }}>
          {/* Chrome bar */}
          <div style={{ background: '#e5e7eb', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ marginLeft: 8 }}>收件箱预览</span>
          </div>
          {/* Subject line in Gmail style */}
          {subjectDisplay && (
            <div style={{ background: '#fff', padding: '10px 14px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.3 }}>
                <span>{subjectDisplay.short}</span>
                {subjectDisplay.clipped && (
                  <span style={{ color: '#ef4444', textDecoration: 'line-through', textDecorationColor: '#ef4444' }} title="Gmail 手机端在此截断">
                    {subjectDisplay.rest}
                  </span>
                )}
              </div>
              {subjectDisplay.clipped && (
                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                  ⚠ Gmail 手机端在 {GMAIL_SUBJECT_CUTOFF} 字符处截断（剩余 {subject.length - GMAIL_SUBJECT_CUTOFF} 字符不可见）
                </div>
              )}
              {preheader && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{preheader}</div>
              )}
            </div>
          )}
          {/* Email body */}
          <iframe
            srcDoc={html}
            title="邮件预览"
            sandbox="allow-same-origin"
            style={{ width: '100%', height: 420, border: 'none', background: '#fff', display: 'block' }}
          />
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>邮件预览</span>
        <button
          onClick={() => setView('mobile')}
          style={{
            padding: '4px 14px', borderRadius: 14, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: view === 'mobile' ? 'var(--primary-light)' : 'var(--card-bg)',
            borderColor: view === 'mobile' ? 'var(--primary)' : 'var(--border)',
            color: view === 'mobile' ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >📱 手机</button>
        <button
          onClick={() => setView('desktop')}
          style={{
            padding: '4px 14px', borderRadius: 14, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: view === 'desktop' ? 'var(--primary-light)' : 'var(--card-bg)',
            borderColor: view === 'desktop' ? 'var(--primary)' : 'var(--border)',
            color: view === 'desktop' ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >🖥️ 桌面</button>
      </div>
      <div style={{
        width: width + 'px',
        maxWidth: '100%',
        margin: '0 auto',
        border: '2px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,.08)',
        transition: 'width .25s',
      }}>
        <div style={{ background: '#e5e7eb', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ marginLeft: 10 }}>{view === 'mobile' ? '手机端' : '桌面端'}收件箱</span>
        </div>
        {subjectDisplay && (
          <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.3 }}>
              <span>{subjectDisplay.short}</span>
              {subjectDisplay.clipped && (
                <span style={{ color: '#ef4444', textDecoration: 'line-through' }}>{subjectDisplay.rest}</span>
              )}
            </div>
            {subjectDisplay.clipped && (
              <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                ⚠ Gmail 手机端 {GMAIL_SUBJECT_CUTOFF} 字符截断 — 剩余 {subject.length - GMAIL_SUBJECT_CUTOFF} 字符不可见
              </div>
            )}
            {preheader && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{preheader}</div>}
          </div>
        )}
        <iframe
          srcDoc={html}
          title="邮件预览"
          sandbox="allow-same-origin"
          style={{ width: '100%', height: 500, border: 'none', background: '#fff', display: 'block' }}
        />
      </div>
    </div>
  );
}
