export default function ScoreBadge({ score, grade }) {
  const letter = grade ? grade.charAt(0) : 'C';
  return (
    <span className={'score-badge score-' + letter}>
      {score}
    </span>
  );
}
