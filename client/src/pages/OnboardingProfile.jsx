import TodoPage from "../components/TodoPage.jsx";

// Endpoints: PUT /api/profiles/me, POST /api/profiles/me/resume
const OWNERS = [
  { responsibility: "Responsibility 2: Applicant profile and resume", name: "Nusrat Begam", id: "6638009" },
];

const LINKS = [
  ["/onboarding/video", "Continue"],
];

export default function OnboardingProfile() {
  return (
    <TodoPage
      title="Onboarding: profile and resume"
      owners={OWNERS}
      location="client/src/pages/OnboardingProfile.jsx"
      links={LINKS}
    />
  );
}
