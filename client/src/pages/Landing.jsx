import TodoPage from "../components/TodoPage.jsx";

const OWNERS = [];

const LINKS = [
  ["/signup", "Get started"],
  ["/login", "Log in"],
];

export default function Landing() {
  return (
    <TodoPage
      title="Landing"
      owners={OWNERS}
      location="client/src/pages/Landing.jsx"
      links={LINKS}
    />
  );
}
