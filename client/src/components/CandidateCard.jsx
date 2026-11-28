// Figma "Candidate card" (P8 Ranked results, P12 Saved). Responsibility 5 — Nusrat Begam (6638009).
// result = MatchResult from /api/matching/results. `actions` comes from useCandidateActions().
import { Link } from 'react-router-dom';
import { Bookmark, Check, Send } from 'lucide-react';
import VideoPoster from './ui/VideoPoster.jsx';
import { MatchScore } from './ui/MatchScore.jsx';
import { Button, IconButton, Tag } from './ui/primitives.jsx';
import { gpaLabel, internshipsLabel, score, yearLabel } from '../utils/format.js';

export default function CandidateCard({ result, suffix = '', actions, kind }) {
  const profileLink = `/role/${result.applicant_id}/profile${suffix}`;
  const matched = new Set(result.matched_skills);
  const others = result.skills.filter((skill) => !matched.has(skill));
  const invited = actions?.isInvited(result.applicant_id);
  const bookmarked = actions?.isBookmarked(result.applicant_id);
  return (
    <article className="rr-card" aria-label={`${result.rank ? `#${result.rank} ` : ''}${result.name}, match score ${score(result.match_score)}`}>
      <VideoPoster src={result.pitch_url} kind={kind || (result.rank ? `#${result.rank}` : 'Pitch')} seconds={result.pitch_duration}
        name={result.name} label={`${result.name}'s pitch video`} emptyText="No pitch yet" preview />
      <div className="rr-card__info">
        {result.rank && <span className="rr-card__rank">#{result.rank} match</span>}
        <h2 className="rr-card__name"><Link to={profileLink}>{result.name}</Link></h2>
        <p className="rr-card__meta ui-text-soft">
          {result.field_of_study} · {yearLabel(result.year)} · GPA {gpaLabel(result.gpa)} · {internshipsLabel(result.internships)}
        </p>
        <span className="rr-card__pill"><strong>{score(result.match_score)}</strong> match</span>
      </div>
      <div className="rr-card__skills ui-tags">
        {result.matched_skills.map((skill) => <Tag key={skill} match>{skill}</Tag>)}
        {others.map((skill) => <Tag key={skill}>{skill}</Tag>)}
        {result.required_skills_count > 0 && (
          <span className="ui-text-xs ui-text-muted">{result.matched_skills.length} of {result.required_skills_count} required skills</span>
        )}
      </div>
      <MatchScore value={result.match_score} />
      <div className="rr-card__actions">
        <div>
          <IconButton icon={Bookmark} label={bookmarked ? 'Remove bookmark' : 'Bookmark candidate'} className={bookmarked ? 'is-on' : undefined}
            aria-pressed={!!bookmarked} onClick={() => actions?.toggleBookmark(result)} />
          {invited ? (
            <span className="ui-badge ui-badge--info"><Check aria-hidden="true" style={{ width: 12, height: 12 }} />Invited</span>
          ) : (
            <Button variant="primary" size="sm" icon={Send} onClick={() => actions?.invite(result)}>{actions?.inviteLabel?.(result.applicant_id) || 'Invite'}</Button>
          )}
        </div>
        <Button variant="secondary" size="sm" to={profileLink}>View profile</Button>
      </div>
    </article>
  );
}
