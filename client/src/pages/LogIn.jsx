import TodoPage from "../components/TodoPage.jsx";

// Endpoints: POST /api/auth/login
const OWNERS = [
  { responsibility: "Responsibility 7: Sign up, log in and roles", name: "Aye Myo Myat", id: "6837919" },
];

const LINKS = [
  ["/profile", "Log in (applicant)"],
  ["/find", "Log in (recruiter)"],
  ["/signup", "Sign up instead"],
];

export default function LogIn() {
  return (
    <TodoPage
      title="Log in"
      owners={OWNERS}
      location="client/src/pages/LogIn.jsx"
      links={LINKS}
    />
  );
}
