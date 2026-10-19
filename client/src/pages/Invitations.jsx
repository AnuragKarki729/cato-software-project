import TodoPage from "../components/TodoPage.jsx";

// Invitations the applicant received. GET /api/invitations/received
// Each card shows: "[Recruiter name] from [Company name] is interested in you and is
// sending this invitation to [applicant email] about a job vacancy."
export default function Invitations() {
  return <TodoPage title="Invitations" responsibility={8} />;
}
