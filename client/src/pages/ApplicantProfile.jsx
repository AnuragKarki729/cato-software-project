import { useParams } from "react-router-dom";
import TodoPage from "../components/TodoPage.jsx";

// Recruiter view of one applicant.
//   Profile details, resume viewer, video gallery – read-only (Responsibilities 1 and 2)
//   Invite button (Responsibility 8): POST /api/invitations
export default function ApplicantProfile() {
  const { applicantId } = useParams();
  return (
    <TodoPage title={`Applicant #${applicantId}`} responsibility="1, 2 and 8" />
  );
}
