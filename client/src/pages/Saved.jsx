import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET, POST and DELETE /api/saved/searches and /api/saved/bookmarks
const OWNERS = [
  { responsibility: "Responsibility 6: Saved searches and bookmarks (optional)", name: "Aye Myo Myat", id: "6837919" },
];

const LINKS = [
  ["/find", "Run search"],
  ["/applicants/1", "Open bookmark"],
];

export default function Saved() {
  return (
    <TodoPage
      title="Saved searches and bookmarks"
      owners={OWNERS}
      location="client/src/pages/Saved.jsx"
      links={LINKS}
    />
  );
}
