import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET /api/profiles/me, GET /api/videos/applicant/:applicantId
const OWNERS = [
  { responsibility: "Responsibility 2: Applicant profile and resume", name: "Nusrat Begam", id: "6638009" },
  { responsibility: "Responsibility 1: Video upload and video retrieval", name: "Anurag Karki", id: "6838852" },
];

const LINKS = [
  ["/invitations", "View invitations"],
  ["/feed", "Video feed"],
];

export default function MyProfile() {
  return (
    <TodoPage
      title="My profile"
      owners={OWNERS}
      location="client/src/pages/MyProfile.jsx"
      links={LINKS}
    />
  );
}
