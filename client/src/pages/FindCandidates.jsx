import { useLocation } from "react-router-dom";
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
  const { state } = useLocation();
  return (
    <div className="space-y-4">
    {state?.savedSearchName && <p role="status" className="rounded-lg bg-brand-50 p-3 text-brand-700">Saved search “{state.savedSearchName}” applied. These are now your current filters.</p>}
    <TodoPage
      title="Find candidates"
      owners={OWNERS}
      location="client/src/pages/FindCandidates.jsx"
      links={LINKS}
    />
    </div>
  );
}
