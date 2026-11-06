import { Route, Routes } from 'react-router-dom'

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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<LogIn />} />

      <Route path="/onboarding/profile" element={<OnboardingProfile />} />
      <Route path="/onboarding/video" element={<OnboardingVideo />} />
      <Route path="/profile" element={<MyProfile />} />
      <Route path="/invitations" element={<Invitations />} />
      <Route path="/feed" element={<VideoFeed />} />

      <Route path="/onboarding/recruiter" element={<OnboardingRecruiter />} />
      <Route path="/find" element={<FindCandidates />} />
      <Route path="/results" element={<RankedResults />} />
      <Route path="/role/:applicantId/profile" element={<ApplicantProfile />} />
      <Route path="/sent-invitations" element={<SentInvitations />} />
      <Route path="/saved" element={<Saved />} />
    </Routes>
  )
}