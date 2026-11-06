import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, homeFor, useAuth } from "./context/AuthContext.jsx";
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

// Responsibility 7 — Aye Myo Myat (6837919): shared authentication and route guards.
export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}

function Protected({ role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to={homeFor(user)} replace /> : children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8" role="status">Loading your session…</p>;
  return (
    <>
      <NavBar user={user} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><LogIn /></GuestOnly>} />
          <Route element={<Protected role="applicant" />}>
            <Route path="/onboarding" element={<Navigate to="/onboarding/profile" replace />} />
            <Route path="/onboarding/profile" element={<OnboardingProfile />} />
            <Route path="/onboarding/video" element={<OnboardingVideo />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/invitations" element={<Invitations />} />
          </Route>
          <Route element={<Protected role="recruiter" />}>
            <Route path="/find" element={<FindCandidates />} />
            <Route path="/results" element={<RankedResults />} />
            <Route path="/applicants/:applicantId" element={<ApplicantProfile />} />
            <Route path="/sent-invitations" element={<SentInvitations />} />
            <Route path="/saved" element={<Saved />} />
          </Route>
          <Route element={<Protected />}>
            <Route path="/feed" element={<VideoFeed />} />
          </Route>
          <Route path="*" element={<section className="card"><h1>Page not found</h1><a className="nav-link" href="/">Back to Cato</a></section>} />
        </Routes>
      </main>
    </>
  );
}
