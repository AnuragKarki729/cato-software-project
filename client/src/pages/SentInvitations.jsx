import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET /api/invitations/sent
const OWNERS = [
  { responsibility: "Responsibility 8: Invitations", name: "Siwakorn P.", id: "6600139" },
];

const LINKS = [
  ["/find", "Find candidates"],
];

export default function SentInvitations() {
  return (
    <TodoPage
      title="Sent invitations"
      owners={OWNERS}
      location="client/src/pages/SentInvitations.jsx"
      links={LINKS}
    />
  );
}
