import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import NavBar from "./components/NavBar.jsx";

import Landing from "./pages/Landing.jsx";
import SignUp from "./pages/SignUp.jsx";
import LogIn from "./pages/LogIn.jsx";
import OnboardingProfile from "./pages/OnboardingProfile.jsx";
import OnboardingVideo from "./pages/OnboardingVideo.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import Invitations from "./pages/Invitations.jsx";
import FindCandidates from "./pages/FindCandidates.jsx";
import RankedResults from "./pages/RankedResults.jsx";
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
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<LogIn />} />

          {/* Applicant pages */}
          <Route path="/onboarding" element={<Navigate to="/onboarding/profile" replace />} />
          <Route path="/onboarding/profile" element={<OnboardingProfile />} />
          <Route path="/onboarding/video" element={<OnboardingVideo />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/invitations" element={<Invitations />} />

          {/* Recruiter pages */}
          <Route path="/find" element={<FindCandidates />} />
          <Route path="/results" element={<RankedResults />} />
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
