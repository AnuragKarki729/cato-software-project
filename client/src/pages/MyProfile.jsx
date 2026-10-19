import TodoPage from "../components/TodoPage.jsx";

// Applicant home page.
//   Profile details + Edit (Responsibility 2): GET /api/profiles/me
//   Resume viewer (Responsibility 2)
//   Video gallery: pitch + up to 5 extra, Add / Delete (Responsibility 1): GET /api/videos/applicant/:id
// The details, resume viewer and video gallery are reused read-only on ApplicantProfile.jsx.
export default function MyProfile() {
  return <TodoPage title="My profile" responsibility="1 and 2" />;
}
