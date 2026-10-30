import TodoPage from "../components/TodoPage.jsx";

// Endpoints: GET /api/feed?page=1
const OWNERS = [
  { responsibility: "Responsibility 3: Short-form video feed (optional)", name: "Anurag Karki", id: "6838852" },
];

const LINKS = [
  ["/applicants/1", "Open profile"],
  ["/feed", "Next pitch"],
];

export default function VideoFeed() {
  return (
    <TodoPage
      title="Video feed"
      owners={OWNERS}
      location="client/src/pages/VideoFeed.jsx"
      links={LINKS}
    />
  );
}
