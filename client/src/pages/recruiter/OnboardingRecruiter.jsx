import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingRecruiter() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  return (
    <div className="container">
      <h1 className="center">Recruiter Onboarding</h1>
      <p className="muted">No owner</p>
      <div className="stack">
        <label className="field">
          Name
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Company name
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </label>
        <button className="btn" onClick={() => navigate('/find')}>
          Continue
        </button>
      </div>
    </div>
  );
}
