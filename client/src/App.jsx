import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, homeFor, useAuth } from './context/AuthContext.jsx'
import usePageTitle from './components/usePageTitle.jsx'

import Landing from './pages/public/Landing.jsx'
import SignUp from './pages/public/SignUp.jsx'
import LogIn from './pages/public/LogIn.jsx'

import OnboardingProfile from './pages/applicant/OnboardingProfile.jsx'
import OnboardingVideo from './pages/applicant/OnboardingVideo.jsx'
import OnboardingReview from './pages/applicant/OnboardingReview.jsx'
import MyProfile from './pages/applicant/MyProfile.jsx'
import Invitations from './pages/applicant/Invitations.jsx'
import VideoFeed from './pages/applicant/VideoFeed.jsx'
import Settings from './pages/applicant/Settings.jsx'

import OnboardingRecruiter from './pages/recruiter/OnboardingRecruiter.jsx'
import FindCandidates from './pages/recruiter/FindCandidates.jsx'
import RankedResults from './pages/recruiter/RankedResults.jsx'
import ExploreCandidates from './pages/recruiter/ExploreCandidates.jsx'
import ApplicantProfile from './pages/recruiter/ApplicantProfile.jsx'
import SentInvitations from './pages/recruiter/SentInvitations.jsx'
import Saved from './pages/recruiter/Saved.jsx'

// Responsibility 7 — Aye Myo Myat (6837919): shared authentication and route guards.
export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}

function Protected({ role }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role && user.role !== role) return <Navigate to={homeFor(user)} replace />
  return <Outlet />
}

function GuestOnly({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to={homeFor(user)} replace /> : children
}

function AppRoutes() {
  const { loading } = useAuth()
  // Named here, once, so the tab says which page and whose view it is on every route.
  usePageTitle()
  if (loading) return <p className="container muted" role="status">Loading your session…</p>

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
      <Route path="/login" element={<GuestOnly><LogIn /></GuestOnly>} />

      <Route element={<Protected role="applicant" />}>
        <Route path="/onboarding/profile" element={<OnboardingProfile />} />
        <Route path="/onboarding/video" element={<OnboardingVideo />} />
        {/* Step 3: check the details read from the resume and pick a field of study */}
        <Route path="/onboarding/review" element={<OnboardingReview />} />
        {/* Responsibility 1: add an extra video later, from My profile */}
        <Route path="/videos/add" element={<OnboardingVideo mode="extra" />} />
        <Route path="/profile" element={<MyProfile />} />
        {/* Responsibility 2: edit the profile, and see it the way recruiters do */}
        <Route path="/profile/edit" element={<OnboardingProfile editing />} />
        <Route path="/profile/preview" element={<ApplicantProfile preview />} />
        <Route path="/invitations" element={<Invitations />} />
        {/* Responsibility 3: the applicant's feed of other people's pitches. Recruiters
            have Explore instead, which pages through candidates rather than videos. */}
        <Route path="/feed" element={<VideoFeed />} />
        {/* Responsibility 2 (issue #5): hide my profile, and block companies */}
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route element={<Protected role="recruiter" />}>
        <Route path="/onboarding/recruiter" element={<OnboardingRecruiter />} />
        <Route path="/find" element={<FindCandidates />} />
        <Route path="/results" element={<RankedResults />} />
        {/* Responsibility 3: browse every candidate with a pitch, no filters */}
        <Route path="/explore" element={<ExploreCandidates />} />
        <Route path="/role/:applicantId/profile" element={<ApplicantProfile />} />
        <Route path="/sent-invitations" element={<SentInvitations />} />
        <Route path="/saved" element={<Saved />} />
      </Route>

      <Route path="*" element={<div className="container"><h1>Page not found</h1><a href="/">Back to Cato</a></div>} />
    </Routes>
  )
}
