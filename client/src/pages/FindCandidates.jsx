import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET /api/options, GET and PUT /api/filters/me
const OWNERS = [
  { responsibility: "Responsibility 4: Recruiter filter page", name: "Siwakorn P.", id: "6600139" },
];

const LINKS = [
  ["/results", "Show matches"],
  ["/saved", "Saved"],
];

export default function FindCandidates() {
  return (
    <TodoPage
      title="Find candidates"
      owners={OWNERS}
      location="client/src/pages/FindCandidates.jsx"
      links={LINKS}
    />
  );
}
