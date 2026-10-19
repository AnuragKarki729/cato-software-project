import TodoPage from "../components/TodoPage.jsx";

// Shown once after an applicant signs up. One page, two steps:
//   Step 1 – Profile form + resume upload (Responsibility 2): PUT /api/profiles/me, POST /api/profiles/me/resume
//   Step 2 – Pitch video recorder, 30 seconds (Responsibility 1): POST /api/videos
export default function Onboarding() {
  return (
    <TodoPage title="Onboarding" responsibility="2 (step 1) and 1 (step 2)" />
  );
}
