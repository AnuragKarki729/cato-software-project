import TodoPage from "../components/TodoPage.jsx";

// Recruiter home page. Filters and results side by side.
//   Filter form, fixed options only (Responsibility 4): GET /api/options, GET/PUT /api/filters/me
//   Ranked results list with match score (Responsibility 5): GET /api/matching/results
//   Clicking a result opens /applicants/:applicantId
export default function FindCandidates() {
  return <TodoPage title="Find candidates" responsibility="4 (filters) and 5 (results)" />;
}
