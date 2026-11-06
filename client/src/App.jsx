import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, homeFor, useAuth } from "./context/AuthContext.jsx";
import NavBar from "./components/NavBar.jsx";

import Landing from './pages/public/Landing.jsx'
import SignUp from './pages/public/SignUp.jsx'
import LogIn from './pages/public/LogIn.jsx'

import OnboardingProfile from './pages/applicant/OnboardingProfile.jsx'
import OnboardingVideo from './pages/applicant/OnboardingVideo.jsx'
import MyProfile from './pages/applicant/MyProfile.jsx'
import Invitations from './pages/applicant/Invitations.jsx'
import VideoFeed from './pages/applicant/VideoFeed.jsx'

import OnboardingRecruiter from './pages/recruiter/OnboardingRecruiter.jsx'
import FindCandidates from './pages/recruiter/FindCandidates.jsx'
import RankedResults from './pages/recruiter/RankedResults.jsx'
import ApplicantProfile from './pages/recruiter/ApplicantProfile.jsx'
import SentInvitations from './pages/recruiter/SentInvitations.jsx'
import Saved from './pages/recruiter/Saved.jsx'

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
  const { pathname } = useLocation();
  const authPage = pathname === "/login" || pathname === "/signup";
  if (loading) return <p className="p-8" role="status">Loading your session…</p>;
  return (
    <>
      {user && <NavBar user={user} />}
      <main className={authPage ? "min-h-screen" : pathname === "/saved" ? "mx-auto max-w-[1168px] px-4 py-8 sm:px-10" : "mx-auto max-w-5xl px-4 py-6"}>
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
