// Figma "Match score" and "Score breakdown". The numbers are computed on the server
// (matching_service.py); these components only display them.
// Responsibility 5 — Nusrat Begum (6638009).
import { score as formatScore } from '../../utils/format.js';

function Meter({ value, max = 100, full }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`ui-meter${full ? ' ui-meter--full' : ''}`} role="presentation">
      <div className="ui-meter__bar" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function MatchScore({ value }) {
  return (
    <div className="ui-score" aria-label={`Match score ${formatScore(value)} out of 100`}>
      <span className="ui-score__label" aria-hidden="true">Match score</span>
      <span className="ui-score__number" aria-hidden="true">
        <span className="ui-score__value">{formatScore(value)}</span>
        <span className="ui-score__out">/ 100</span>
      </span>
      <Meter value={value} />
    </div>
  );
}

export function ScoreBreakdown({ result }) {
  const { breakdown, matched_skills: matched, required_skills_count: required, gpa, internships } = result;
  const parts = [
    { label: 'Skills', detail: required ? `${matched.length} of ${required} required` : 'No skills required', value: breakdown.skills, max: 60 },
    { label: 'GPA', detail: `${Number(gpa).toFixed(2)} of 4.00`, value: breakdown.gpa, max: 20 },
    { label: 'Internships', detail: `${internships} (max counted 3)`, value: breakdown.internships, max: 20 },
  ];
  return (
    <section className="ui-card ui-breakdown" aria-label="Match score breakdown">
      <MatchScore value={result.match_score} />
      {parts.map((part) => (
        <div className="ui-breakdown__part" key={part.label}>
          <div className="ui-breakdown__line">
            <span className="ui-breakdown__label">{part.label}<span>{part.detail}</span></span>
            <span className="ui-breakdown__value">{formatScore(part.value)} / {part.max}</span>
          </div>
          <Meter value={part.value} max={part.max} full />
        </div>
      ))}
      <p className="ui-text-xs ui-text-muted">
        Score = 60 × skills matched ÷ skills required + 20 × GPA ÷ 4 + 20 × min(internships, 3) ÷ 3
      </p>
    </section>
  );
}
