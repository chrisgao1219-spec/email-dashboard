export default function ToneTag({ tone }) {
  if (!tone || tone === '中立陈述') return <span>{tone || ''}</span>;
  return <span className={'tone-tag tone-' + tone}>{tone}</span>;
}
