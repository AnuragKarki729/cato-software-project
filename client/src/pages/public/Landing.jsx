// Figma "P1 · Landing" (desktop) and "P1 · Landing (mobile)".
// UI by Nusrat Begam (6638009). The hero card is an illustration, not live data.
import { Bookmark, Check, CircleCheck, Search, Send, Video, X } from 'lucide-react';
import { homeFor, useAuth } from '../../context/AuthContext.jsx';
import { Button, Logo } from '../../components/ui/primitives.jsx';
import glow from '../../assets/figma/landing-glow.svg';
import jensenVideo from '../../assets/jensen_demo.mp4';

const APPLICANT_STEPS = [
  ['Build your profile', 'Field of study, year, GPA, internships, skills and your resume. About 5 minutes.'],
  ['Record a 30-second pitch', 'Right in the browser, or upload a clip. Re-record as often as you like.'],
  ['Get invited', 'Recruiters whose needs match yours invite you. You accept or decline.'],
];
const RECRUITER_STEPS = [
  ['Set your must-haves', 'Field of study, minimum year, GPA and internships, plus the skills you need.'],
  ['Review a ranked shortlist', 'Everyone who passes gets a 0–100 score. Watch pitches before CVs.'],
  ['Invite in one click', 'A fixed, respectful message. Contact details are shared only after acceptance.'],
];
const PARTS = [
  ['Skills', '4 of 4 required', 60, 60],
  ['GPA', '3.62 of 4.00', 18.1, 20],
  ['Internships', '2 (max counted 3)', 13.3, 20],
];

function Steps({ steps }) {
  return steps.map(([title, text], index) => (
    <div className="lp-step" key={title}>
      <span className="lp-step__num">{index + 1}</span>
      <div><p className="lp-step__title">{title}</p><p className="ui-text-soft">{text}</p></div>
    </div>
  ));
}

function DemoBreakdown() {
  return (
    <div className="ui-card ui-breakdown lp-breakdown" aria-label="Example match score breakdown">
      <div className="ui-score">
        <span className="ui-score__label">Match score</span>
        <span className="ui-score__number"><span className="ui-score__value">91</span><span className="ui-score__out">/ 100</span></span>
        <div className="ui-meter"><div className="ui-meter__bar" style={{ width: '91%' }} /></div>
      </div>
      {PARTS.map(([label, detail, value, max]) => (
        <div className="ui-breakdown__part" key={label}>
          <div className="ui-breakdown__line">
            <span className="ui-breakdown__label">{label}<span>{detail}</span></span>
            <span className="ui-breakdown__value">{value} / {max}</span>
          </div>
          <div className="ui-meter ui-meter--full"><div className="ui-meter__bar" style={{ width: `${(value / max) * 100}%` }} /></div>
        </div>
      ))}
      <p className="ui-text-xs ui-text-muted">Score = 60 × skills matched ÷ skills required + 20 × GPA ÷ 4 + 20 × min(internships, 3) ÷ 3</p>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="ui-app lp">
      <header className="ui-header lp-header">
        <Logo />
        <div className="lp-header__actions">
          {user ? (
            <Button variant="primary" size="md" to={homeFor(user)}>Open Cato</Button>
          ) : (
            <>
              <Button variant="ghost" size="md" to="/login" className="lp-login">Log in</Button>
              <Button variant="primary" size="md" to="/signup" className="lp-signup">Sign up</Button>
            </>
          )}
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero__copy">
          <span className="lp-eyebrow"><Video aria-hidden="true" />For students, fresh graduates and recruiters</span>
          <h1 className="lp-title">Show who you are in 30 seconds.</h1>
          <p className="lp-lead">
            Applicants build one profile with a 30-second pitch video. Recruiters pick the skills they need and get a
            ranked shortlist with a match score they can explain. No job posts, no blind applications.
          </p>
          <div className="lp-ctas">
            <Button variant="primary" size="lg" to="/signup?role=applicant">Create your profile</Button>
            <Button variant="secondary" size="lg" to="/signup?role=recruiter">I’m hiring</Button>
          </div>
          <ul className="lp-trust">
            {['Free for students', 'Explainable ranking', 'PDPA-aware by default'].map((text) => (
              <li key={text}><CircleCheck aria-hidden="true" />{text}</li>
            ))}
          </ul>
        </div>

        {/* Desktop product visual */}
        <div className="lp-visual" aria-hidden="true">
          <img className="lp-visual__glow" src={glow} alt="" width="680" height="680" />
          <div className="lp-feed" onMouseEnter={(e) => { const v = e.currentTarget.querySelector('video'); if (v) { v.currentTime = 0; v.play(); } }} onMouseLeave={(e) => { const v = e.currentTarget.querySelector('video'); if (v) { v.currentTime = 0; } }}>
            <video className="lp-feed__video" src={jensenVideo} autoPlay muted loop playsInline />
            <span className="lp-feed__shade" />
            <div className="lp-feed__top">
              <span className="lp-feed__kind">Pitch · 0:28</span>
              <span className="lp-pill"><strong>84</strong> match</span>
            </div>
            <div className="lp-feed__details">
              <p className="lp-feed__name">Jensen Huang</p>
              <p className="lp-feed__meta">Computer Science · Year 3 · GPA 3.85 · 3 internships</p>
              <div className="lp-feed__skills">{['Python', 'SQL', 'Docker'].map((s) => <span key={s}>{s}</span>)}</div>
              <div className="lp-feed__actions">
                <span className="ui-btn ui-btn--accent ui-btn--md lp-feed__invite"><Send />Invite</span>
                <span className="ui-icon-btn ui-icon-btn--md ui-icon-btn--secondary"><Bookmark /></span>
                <span className="ui-btn ui-btn--secondary ui-btn--md">View profile</span>
              </div>
            </div>
          </div>
          <div className="ui-toast lp-toast">
            <CircleCheck />
            <div className="ui-toast__text"><p className="ui-toast__title">Invitation sent</p><p className="ui-toast__message">Jensen Huang will see it on their Invitations page.</p></div>
            <span className="ui-icon-btn"><X /></span>
          </div>
          <div className="lp-chip">
            <div className="ui-score">
              <span className="ui-score__label">Match score</span>
              <span className="ui-score__number"><span className="ui-score__value">84</span><span className="ui-score__out">/ 100</span></span>
              <div className="ui-meter"><div className="ui-meter__bar" style={{ width: '84%' }} /></div>
            </div>
            <p className="ui-text-xs ui-text-muted">Skills 45 · GPA 19.3 · Internships 20</p>
          </div>
        </div>

        {/* Mobile pitch card. Below 1100px the tall visual above is hidden and this stands in
            for it, so it plays the same clip: a landing page whose whole point is the pitch
            video should not be showing a still frame on an unmaximised laptop. */}
        <div className="ui-card lp-mobile-card" aria-hidden="true">
          <div className="ui-poster lp-mobile-card__poster">
            <video className="lp-feed__video" src={jensenVideo} autoPlay muted loop playsInline />
            <span className="ui-poster__shade" />
            <span className="ui-poster__kind">Pitch</span>
            <span className="ui-poster__duration">0:28</span>
          </div>
          <div className="lp-mobile-card__row">
            <div><p className="lp-step__title">Jensen Huang</p><p className="ui-text-xs ui-text-muted">Computer Science · Year 3</p></div>
            <span className="lp-pill"><strong>91</strong> match</span>
          </div>
        </div>
      </section>

      <section className="lp-how" aria-labelledby="how-title">
        <div className="lp-section-head">
          <p className="ui-overline">How it works</p>
          <h2 id="how-title" className="ui-h2">Two sides, one simple flow</h2>
        </div>
        <div className="lp-columns">
          <article className="lp-panel">
            <div className="lp-panel__head"><span className="lp-tile lp-tile--accent"><Video aria-hidden="true" /></span><h3 className="ui-h4">For applicants</h3></div>
            <Steps steps={APPLICANT_STEPS} />
          </article>
          <article className="lp-panel">
            <div className="lp-panel__head"><span className="lp-tile lp-tile--dark"><Search aria-hidden="true" /></span><h3 className="ui-h4">For recruiters</h3></div>
            <Steps steps={RECRUITER_STEPS} />
          </article>
        </div>
      </section>

      <section className="lp-fair" aria-labelledby="fair-title">
        <div className="lp-fair__copy">
          <p className="ui-overline">Fair by design</p>
          <h2 id="fair-title" className="ui-h2">A score you can explain</h2>
          <p className="lp-lead">
            Must-haves remove anyone who doesn’t qualify. Everyone left gets the same formula: up to 60 points for skills,
            20 for GPA and 20 for internships. Photos, names, gender and age are never part of the score.
          </p>
          <ul className="lp-points">
            {['Same rules for every applicant', 'Score breakdown on every profile', 'Ties broken by GPA, then the newest profile'].map((text) => (
              <li key={text}><Check aria-hidden="true" />{text}</li>
            ))}
          </ul>
        </div>
        <DemoBreakdown />
      </section>

      <section className="lp-band">
        <div>
          <h2 className="lp-band__title">Ready to be seen?</h2>
          <p className="lp-band__text">Create a profile in five minutes. Your pitch does the rest.</p>
        </div>
        <div className="lp-band__buttons">
          <Button variant="accent" size="lg" to="/signup?role=applicant">Create your profile</Button>
          <Button variant="secondary" size="lg" to="/signup?role=recruiter" className="lp-band__hiring">I’m hiring</Button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer__brand"><Logo /><span className="ui-text-muted">Better hires, brighter futures.</span></div>
        <nav className="lp-footer__links" aria-label="Footer"><span>Privacy &amp; PDPA</span><span>Terms</span><span>Contact</span></nav>
        <p className="ui-text-muted">© 2026 Team Cato · ITCS525, Mahidol ICT</p>
      </footer>
    </div>
  );
}
