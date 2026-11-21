// Figma "P10 · Sent invitations". UI by Nusrat Begam (6638009).
// Data: GET /api/invitations/sent (Responsibility 8, Siwakorn P.). Until that route exists the
// page shows the design's sample statuses on real demo applicants, and says so.
import { useEffect, useState } from 'react';
import { CircleAlert, Eye, Info } from 'lucide-react';
import { api } from '../../api.js';
import AppHeader from '../../components/AppHeader.jsx';
import { Avatar, Badge, Button } from '../../components/ui/primitives.jsx';
import { SAMPLE_SENT, routeMissing } from '../../data/samples.js';
import { score, shortDate, yearLabel } from '../../utils/format.js';

const STATUS = { pending: ['warning', 'Pending'], accepted: ['success', 'Accepted'], declined: ['danger', 'Declined'] };

async function sampleRows() {
  const page = await api.get('/matching/results?limit=6&min_year=1');
  return page.results.map((r, i) => ({
    id: `sample-${r.applicant_id}`, applicant_id: r.applicant_id, name: r.name,
    detail: [r.field_of_study, yearLabel(r.year), SAMPLE_SENT[i].source || `score ${score(r.match_score)}`].join(' · '),
    ...SAMPLE_SENT[i],
  }));
}

export default function SentInvitations() {
  const [rows, setRows] = useState(null);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/invitations/sent')
      .then((list) => { if (active) setRows(list); })
      .catch(async (err) => {
        if (!routeMissing(err)) { if (active) setError(err.message); return; }
        try { const list = await sampleRows(); if (active) { setRows(list); setSample(true); } }
        catch (e) { if (active) setError(e.message); }
      });
    return () => { active = false; };
  }, []);

  const count = (status) => rows?.filter((row) => row.status === status).length ?? 0;

  return (
    <div className="ui-app">
      <AppHeader />
      <main className="ui-main">
        <div className="fc-heading">
          <h1 className="ui-h2">Sent invitations</h1>
          <p className="ui-lead">Everyone you invited and their answer. Accepted applicants’ emails appear in their row.</p>
        </div>
        {sample && <p className="ui-alert ui-alert--info"><Info />Sample invitations from the design. Sending and tracking invitations is Responsibility 8 and not connected yet.</p>}
        {error && <p className="ui-alert ui-alert--error" role="alert"><CircleAlert />{error}</p>}

        <div className="si-stats">
          {Object.entries(STATUS).map(([status, [tone, label]]) => (
            <section className="ui-card si-stat" key={status} aria-label={`${label}: ${count(status)}`}>
              <Badge tone={tone}>{label}</Badge>
              <strong>{rows ? count(status) : '–'}</strong>
            </section>
          ))}
        </div>

        <section className="si-table" aria-label="Sent invitations">
          <div className="si-row si-row--head" role="row">
            <span>Candidate</span><span>Sent</span><span>Status</span><span />
          </div>
          {!rows && !error && [0, 1, 2].map((i) => <div key={i} className="si-row"><span className="ui-skeleton" style={{ height: 40, gridColumn: '1 / -1' }} /></div>)}
          {rows?.length === 0 && <p className="si-empty ui-text-muted">You have not invited anyone yet. Invite candidates from Ranked results or the video feed.</p>}
          {rows?.map((row) => {
            const [tone, label] = STATUS[row.status] || STATUS.pending;
            return (
              <div className="si-row" key={row.id}>
                <span className="si-person">
                  <Avatar name={row.name} />
                  <span><strong>{row.name}</strong><small>{row.detail}</small></span>
                </span>
                <span className="ui-text-soft">Sent {shortDate(row.date)}</span>
                <span><Badge tone={tone}>{label}</Badge></span>
                <span className="si-action"><Button variant="ghost" size="sm" icon={Eye} to={`/role/${row.applicant_id}/profile`}>View profile</Button></span>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
