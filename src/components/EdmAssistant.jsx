import { useState, useRef, useEffect, useCallback } from 'react';

const SUGGESTIONS = [
  '怎么写一封高打开率的欢迎邮件？',
  '弃购邮件的发送时机和频率？',
  '邮件主题行最佳长度是多少？',
  '怎么避免邮件进垃圾箱？',
  '新手一周发几封邮件合适？',
  'A/B 测试先测什么最重要？',
];

export default function EdmAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('edm_chat_history') || '[]'); }
    catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuestion, setLastQuestion] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Persist chat history
  useEffect(() => {
    try {
      const toSave = messages.length > 20 ? messages.slice(-20) : messages;
      localStorage.setItem('edm_chat_history', JSON.stringify(toSave));
    } catch {}
  }, [messages]);

  const send = useCallback(async (q) => {
    const text = (q || question).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLastQuestion(text);
    setLoading(true);
    setError(null);

    try {
      const history = messagesRef.current.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        searched: data.searched,
        sources: data.sources,
      }]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [question, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleSuggestion = (s) => {
    send(s);
  };

  // Floating button (closed state)
  if (!open) {
    return (
      <button type="button" className="edm-fab" onClick={() => setOpen(true)} title="AI 邮件营销助手">
        <span className="edm-fab-icon">🤖</span>
        <span className="edm-fab-label">AI 助手</span>
      </button>
    );
  }

  return (
    <div className="edm-chat">
      <div className="edm-chat-header">
        <div className="edm-chat-header-left">
          <span>🤖</span>
          <div>
            <strong>EDM AI 助手</strong>
            <small>DeepSeek + 全网搜索 · 实时数据驱动回答</small>
          </div>
        </div>
        <div className="edm-chat-header-right">
          {messages.length > 0 && (
            <button type="button" className="edm-chat-clear" title="清除对话" onClick={() => { setMessages([]); try { localStorage.removeItem('edm_chat_history'); } catch {} }}>
              🗑️
            </button>
          )}
          <button type="button" className="edm-chat-close" onClick={() => setOpen(false)}>✕</button>
        </div>
      </div>

      <div className="edm-chat-body">
        {messages.length === 0 && (
          <div className="edm-chat-welcome">
            <div className="edm-chat-welcome-icon">🤖</div>
            <strong>你好！我是 EDM 邮件营销助手</strong>
            <p>可以问我任何关于邮件营销的问题：策略、文案、序列设计、发送时机、行业基准…</p>
            <div className="edm-chat-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} type="button" className="edm-chat-suggestion" onClick={() => handleSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`edm-chat-msg edm-chat-msg-${msg.role}`}>
            <span className="edm-chat-msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</span>
            <div className="edm-chat-msg-bubble">
              {msg.content}
              {msg.sources && msg.sources.length > 0 && (
                <div className="edm-chat-sources">
                  <span className="edm-chat-sources-label">🔗 参考来源：</span>
                  {msg.sources.map((s, si) => (
                    <a key={si} href={s.url} target="_blank" rel="noopener noreferrer" className="edm-chat-source-link">{s.title}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="edm-chat-msg edm-chat-msg-assistant">
            <span className="edm-chat-msg-avatar">🤖</span>
            <div className="edm-chat-msg-bubble edm-chat-typing">
              <span style={{fontSize:11,color:'var(--text-muted)',marginRight:6}}>全网搜索中</span>
              <span className="edm-dot" />
              <span className="edm-dot" />
              <span className="edm-dot" />
            </div>
          </div>
        )}

        {error && (
          <div className="edm-chat-error">
            ⚠️ {error}
            <button type="button" className="btn btn-sm btn-outline" style={{ marginLeft: 8 }} onClick={() => { setError(null); send(lastQuestion); }}>重试</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="edm-chat-input">
        <textarea
          ref={inputRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题，按 Enter 发送…"
          rows={1}
          disabled={loading}
        />
        <button type="button" className="edm-chat-send" onClick={() => send()} disabled={loading || !question.trim()}>
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}
