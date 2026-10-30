import TodoPage from "../components/TodoPage.jsx";

// Endpoints: POST /api/videos
const OWNERS = [
  { responsibility: "Responsibility 1: Video upload and video retrieval", name: "Anurag Karki", id: "6838852" },
];

const LINKS = [
  ["/profile", "Finish"],
  ["/onboarding/profile", "Back"],
];

export default function OnboardingVideo() {
  return (
    <TodoPage
      title="Onboarding: pitch video"
      owners={OWNERS}
      location="client/src/pages/OnboardingVideo.jsx"
      links={LINKS}
    />
  );
}
