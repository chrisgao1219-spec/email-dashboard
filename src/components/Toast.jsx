const ICONS = { ok: '✅', err: '❌', info: 'ℹ️' };

export default function Toast({ message, type }) {
  const role = type === 'err' ? 'alert' : 'status';

  return (
    <div className={'toast ' + (type || 'info')} role={role} aria-live={type === 'err' ? 'assertive' : 'polite'}>
      <span>{ICONS[type] || ICONS.info}</span>
      <span>{message}</span>
    </div>
  );
}
