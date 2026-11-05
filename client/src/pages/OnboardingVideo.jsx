import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { VideoTrim } from "react-video-trim";
import { trimVideo } from "react-video-trim/plugins/webcodecs";
import "react-video-trim/style.css";
import { api } from "../api.js";

// Endpoints: POST /api/videos
export default function OnboardingVideo() {
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(null);
  const [trimSource, setTrimSource] = useState(null);
  const [needsTrim, setNeedsTrim] = useState(false);
  const [trimming, setTrimming] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setMessage("");
    setFile(null);
    setDuration(null);
    setNeedsTrim(false);
    const preview = document.createElement("video");
    preview.preload = "metadata";
    preview.onloadedmetadata = () => {
      const seconds = preview.duration;
      if (preview.videoWidth > preview.videoHeight) {
        URL.revokeObjectURL(preview.src);
        setMessage("Please choose a portrait video.");
        return;
      }
      if (seconds > 20) {
        setDuration(seconds);
        setTrimSource(selected);
        setNeedsTrim(true);
        setMessage("Select the beginning and end of a 20-second clip, then trim it.");
        return;
      }
      setFile(selected);
      setDuration(seconds);
    };
    preview.src = URL.createObjectURL(selected);
  }

  async function trimInBrowser(range) {
    const clipLength = range.endTime - range.startTime;
    if (clipLength <= 0 || clipLength > 20) {
      setMessage("Please select a clip that is 20 seconds or less.");
      return;
    }
    setTrimming(true);
    setMessage("");
    try {
      const result = await trimVideo(trimSource, { ...range, outputFormat: "mp4" });
      const trimmed = new File([result.blob], "pitch.mp4", { type: "video/mp4" });
      setFile(trimmed);
      setDuration(clipLength);
      setNeedsTrim(false);
      setMessage("Your 20-second clip is ready to upload.");
    } catch (error) {
      setMessage("Could not trim this video. Please try another video or use Chrome/Edge.");
    } finally {
      setTrimming(false);
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!file || !duration) return;
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "pitch");
      form.append("duration_seconds", duration.toFixed(1));
      await api.post("/videos", form);
      setFile(null);
      setDuration(null);
      setNeedsTrim(false);
      navigate("/profile");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-5">
      {!needsTrim && (
      <div>
        <p className="text-sm font-semibold text-brand-700">Step 2 of 2</p>
        <h1>Introduce yourself</h1>
        <p className="mt-2 text-ink-soft">Record a portrait pitch, or choose one from your gallery. Keep it to 20 seconds or less.</p>
      </div>
      )}
      <form className="card space-y-4" onSubmit={upload}>
        {!needsTrim && (
        <div className="card flex flex-col items-center justify-center gap-4 bg-gray-200 hover-scale">
        <label className="flex w-full flex-col items-center gap-2 text-center text-sm font-medium">
          Choose from gallery or record now
          <input className="block w-full cursor-pointer text-sm" type="file" accept="video/mp4,video/quicktime,video/webm" capture="user" onChange={chooseFile} />
        </label>
        </div>
        )}
        {needsTrim && (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-sm text-ink-muted">Drag the timeline handles to choose a clip of 20 seconds or less.</p>
            {trimming ? <p className="text-sm text-ink-muted">Creating your trimmed video…</p> : <VideoTrim className="mx-auto" style={{ maxWidth: "40rem" }} src={trimSource} onTrim={trimInBrowser} onCancel={() => setNeedsTrim(false)} />}
          </div>
        )}
        {file && <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">Ready: {file.name} ({duration?.toFixed(1)} seconds)</p>}
        {message && <p className="text-sm text-ink-soft" role="status">{message}</p>}
        <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload video"}
        </button>
      </form>

      <div className="flex gap-3">
        <Link className="btn-secondary" to="/onboarding/profile">Back</Link>
      </div>
    </section>
  );
}
