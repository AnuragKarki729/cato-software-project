// Mock data, so no responsibility waits for another. Use it while the real endpoint
// returns 501, then swap it for the api.js call. Shapes match the server schemas.

export const MOCK_PROFILE = {
  user_id: 3, university: "Mahidol University", field_of_study: "Computer Science", year: 4,
  gpa: 3.6, skills: ["Python", "React", "SQL"], internships: 2, resume_url: null,
};

export const MOCK_VIDEOS = [
  { id: 1, applicant_id: 3, kind: "pitch", duration_seconds: 28.5, url: "", created_at: "2026-10-30T10:00:00" },
];

export const MOCK_FILTER = {
  recruiter_id: 1, field_of_study: "Computer Science", min_year: 2, min_internships: 0,
  skills: ["Python"], min_gpa: 3.0,
};

export const MOCK_RESULTS = [
  { applicant_id: 3, name: "Alex Kim", field_of_study: "Computer Science", year: 4, match_score: 91.3 },
  { applicant_id: 4, name: "Bea Santos", field_of_study: "Computer Science", year: 2, match_score: 75.5 },
];

export const MOCK_FEED = [{ ...MOCK_VIDEOS[0], name: "Alex Kim" }];

export const MOCK_INVITATIONS = [
  {
    id: 1, recruiter_id: 1, applicant_id: 3, applicant_name: "Alex Kim", sent_at: "2026-10-30T10:00:00",
    message: "Mia Recruiter from TechCorp is interested in you and is sending this invitation to alex@uni.test about a job vacancy.",
  },
];

export const MOCK_SAVED_SEARCHES = [{ id: 1, name: "CS final years", ...MOCK_FILTER }];
export const MOCK_BOOKMARKS = [{ id: 1, recruiter_id: 1, applicant_id: 3 }];
