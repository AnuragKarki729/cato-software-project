import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET /api/invitations/received
const OWNERS = [
  { responsibility: "Responsibility 8: Invitations", name: "Siwakorn P.", id: "6600139" },
];

const LINKS = [
  ["/profile", "My profile"],
];

export default function Invitations() {
  return (
    <TodoPage
      title="Invitations"
      owners={OWNERS}
      location="client/src/pages/Invitations.jsx"
      links={LINKS}
    />
  );
}
