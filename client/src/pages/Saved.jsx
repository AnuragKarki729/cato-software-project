import TodoPage from "../components/TodoPage.jsx";

// Optional. Saved searches (Run opens Find candidates with those filters) and bookmarks.
// GET /api/saved/searches, GET /api/saved/bookmarks
export default function Saved() {
  return <TodoPage title="Saved searches and bookmarks (optional)" responsibility={6} />;
}
