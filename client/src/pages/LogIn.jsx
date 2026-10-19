import TodoPage from "../components/TodoPage.jsx";

// Log in form: email and password. POST /api/auth/login
// Afterwards: applicants go to /onboarding or /profile, recruiters go to /find.
export default function LogIn() {
  return <TodoPage title="Log in" responsibility={7} />;
}
