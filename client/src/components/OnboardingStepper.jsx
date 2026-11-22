// Responsibility 1/2 — the three onboarding steps, shared by all three screens so they
// cannot drift apart: resume upload, pitch video, then checking the details.
import { Check } from 'lucide-react';

const STEPS = ['Your resume', 'Pitch video', 'Check details'];

export default function OnboardingStepper({ current = 1 }) {
  return (
    <ol className="ui-stepper" aria-label="Onboarding steps">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="ui-stepper__group">
            {index > 0 && <span aria-hidden="true" className={`ui-step__line${done || active ? ' is-done' : ''}`} />}
            <span className={`ui-step${done ? ' is-done' : ''}${active ? ' is-current' : ''}`}
              aria-current={active ? 'step' : undefined}>
              <span className="ui-step__dot">{done ? <Check aria-hidden="true" /> : step}</span>
              <span className="ui-step__text"><small>Step {step}</small><strong>{label}</strong></span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
