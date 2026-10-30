import TodoPage from "../components/TodoPage.jsx";

// Endpoints: POST /api/auth/signup
const OWNERS = [
  { responsibility: "Responsibility 7: Sign up, log in and roles", name: "Aye Myo Myat", id: "6837919" },
];

const LINKS = [
  ["/onboarding/profile", "Create account (applicant)"],
  ["/find", "Create account (recruiter)"],
  ["/login", "Log in instead"],
];

export default function SignUp() {
  return (
    <TodoPage
      title="Sign up"
      owners={OWNERS}
      location="client/src/pages/SignUp.jsx"
      links={LINKS}
    />
  );
}
