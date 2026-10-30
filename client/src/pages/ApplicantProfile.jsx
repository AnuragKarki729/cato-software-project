import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET /api/profiles/:applicantId, GET /api/videos/applicant/:applicantId, POST /api/invitations
const OWNERS = [
  { responsibility: "Responsibility 2: Applicant profile and resume", name: "Nusrat Begam", id: "6638009" },
  { responsibility: "Responsibility 1: Video upload and video retrieval", name: "Anurag Karki", id: "6838852" },
  { responsibility: "Responsibility 8: Invitations", name: "Siwakorn P.", id: "6600139" },
];

const LINKS = [
  ["/sent-invitations", "Invite"],
  ["/results", "Back to results"],
];

export default function ApplicantProfile() {
  return (
    <TodoPage
      title="Candidate profile"
      owners={OWNERS}
      location="client/src/pages/ApplicantProfile.jsx"
      links={LINKS}
    />
  );
}
