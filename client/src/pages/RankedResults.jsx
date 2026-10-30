import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET /api/matching/results
const OWNERS = [
  { responsibility: "Responsibility 5: Candidate matching and ranked results", name: "Nusrat Begam", id: "6638009" },
];

const LINKS = [
  ["/applicants/1", "View profile"],
  ["/find", "Edit filters"],
  ["/feed", "Watch pitches"],
];

export default function RankedResults() {
  return (
    <TodoPage
      title="Ranked results"
      owners={OWNERS}
      location="client/src/pages/RankedResults.jsx"
      links={LINKS}
    />
  );
}
