import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [pitch, setPitch] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfileVideo() {
      try {
        const currentUser = await api.get("/auth/me");
        setUser(currentUser);
        const videos = await api.get(`/videos/applicant/${currentUser.id}`);
        setPitch(videos.find((video) => video.kind === "pitch") || null);
      } catch (error) {
        setMessage(error.message);
      }
    }
    loadProfileVideo();
  }, []);

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1>My profile</h1>
        {user && <p className="mt-1 text-ink-soft">{user.name}</p>}
      </div>

      <section className="card space-y-4">
        <h2>My pitch video</h2>
        {pitch ? (
          <video className="mx-auto h-auto w-full rounded-lg bg-black" style={{ maxWidth: "28rem" }} controls playsInline src={pitch.url}>
            Your browser does not support video playback.
          </video>
        ) : (
          <p className="text-ink-muted">You have not uploaded a pitch video yet.</p>
        )}
        <Link className="btn-secondary" to="/onboarding/video">{pitch ? "Replace video" : "Upload video"}</Link>
      </section>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </section>
  );
}
