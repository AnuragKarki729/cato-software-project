import TodoPage from "../components/TodoPage.jsx";

// Sign up form: name, email, password, Applicant or Recruiter, company name for recruiters.
// POST /api/auth/signup
export default function SignUp() {
  return <TodoPage title="Sign up" responsibility={7} />;
}
