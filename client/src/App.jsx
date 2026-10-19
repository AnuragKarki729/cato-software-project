import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import NavBar from "./components/NavBar.jsx";

import Landing from "./pages/Landing.jsx";
import SignUp from "./pages/SignUp.jsx";
import LogIn from "./pages/LogIn.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import Invitations from "./pages/Invitations.jsx";
import FindCandidates from "./pages/FindCandidates.jsx";
import ApplicantProfile from "./pages/ApplicantProfile.jsx";
import SentInvitations from "./pages/SentInvitations.jsx";
import VideoFeed from "./pages/VideoFeed.jsx";
import Saved from "./pages/Saved.jsx";

export default function App() {
  const [user, setUser] = useState(null);

  // Who is logged in? (temporary development login, see api.js)
  useEffect(() => {
    api.get("/auth/me").then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <>
      <NavBar user={user} onUserChange={setUser} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          {/* Everyone */}
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<LogIn />} />

          {/* Applicant pages */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profile" element={<MyProfile user={user} />} />
          <Route path="/invitations" element={<Invitations />} />

          {/* Recruiter pages */}
          <Route path="/find" element={<FindCandidates />} />
          <Route path="/applicants/:applicantId" element={<ApplicantProfile />} />
          <Route path="/sent-invitations" element={<SentInvitations />} />

          {/* Optional pages */}
          <Route path="/feed" element={<VideoFeed />} />
          <Route path="/saved" element={<Saved />} />
        </Routes>
      </main>
    </>
  );
}
