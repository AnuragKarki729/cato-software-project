# Client (React)

The client lives in `client/`. It is a React app written in **JavaScript**, styled with **plain CSS**
and run with Vite. Back to the [overview](overview.md).

> Earlier versions of this document described Tailwind CSS. There is no Tailwind in the project:
> `client/package.json` has `react`, `react-dom`, `react-router-dom`, `lucide-react` and
> `react-video-trim`, and all styling is written by hand in `src/styles/`.

## Folder structure

```
client/
├── index.html
├── vite.config.js          Vite + React, forwards /api to the server
├── package.json
├── Dockerfile
└── src/
    ├── main.jsx            starts React and the router
    ├── App.jsx             page routes + role guards
    ├── api.js              api.get / post / put / delete helpers
    ├── context/
    │   └── AuthContext.jsx current user, login and logout
    ├── components/
    │   ├── ui/             the design system (see below)
    │   ├── AppHeader.jsx   top bar, links per role, logout
    │   ├── AuthShell.jsx   layout for the sign up and log in pages
    │   ├── CandidateCard.jsx        one applicant in a list
    │   ├── useCandidateActions.jsx  bookmark and invite actions
    │   ├── BookmarkButton.jsx, SaveSearchButton.jsx
    │   └── AuthLayout.jsx, Brand.jsx, Icon.jsx, NavBar.jsx
    ├── data/samples.js     placeholder data for screens whose backend is missing
    ├── utils/              format.js, filters.js
    ├── styles/             variables, base, layout, components, ui, pages, public
    └── pages/
        ├── public/         Landing, SignUp, LogIn
        ├── applicant/      OnboardingProfile, OnboardingVideo, MyProfile, Invitations, VideoFeed
        └── recruiter/      OnboardingRecruiter, FindCandidates, RankedResults,
                            ApplicantProfile, SentInvitations, Saved
```

Open it at http://localhost:5173. Changes in `src/` reload the page automatically.

`NavBar.jsx`, `AuthLayout.jsx` and the loose page files directly under `src/pages/` are left over from
earlier versions and are no longer imported by any page. `AppHeader` replaced `NavBar`.

## Pages

| URL | File | Who | Responsibility |
|---|---|---|---|
| `/` | `public/Landing.jsx` | everyone | – |
| `/signup` | `public/SignUp.jsx` | everyone | 7 |
| `/login` | `public/LogIn.jsx` | everyone | 7 |
| `/onboarding/profile` | `applicant/OnboardingProfile.jsx` | applicant | 2 |
| `/onboarding/video` | `applicant/OnboardingVideo.jsx` | applicant | 1 |
| `/profile` | `applicant/MyProfile.jsx` | applicant | 1, 2 |
| `/profile/edit` | `applicant/OnboardingProfile.jsx` (`editing`) | applicant | 2 |
| `/profile/preview` | `recruiter/ApplicantProfile.jsx` (`preview`) | applicant | 2 |
| `/invitations` | `applicant/Invitations.jsx` | applicant | 8 |
| `/onboarding/recruiter` | `recruiter/OnboardingRecruiter.jsx` | recruiter | 7 |
| `/find` | `recruiter/FindCandidates.jsx` | recruiter | 4 |
| `/results` | `recruiter/RankedResults.jsx` | recruiter | 5 |
| `/role/:applicantId/profile` | `recruiter/ApplicantProfile.jsx` | recruiter | 1, 2, 8 |
| `/sent-invitations` | `recruiter/SentInvitations.jsx` | recruiter | 8 |
| `/saved` | `recruiter/Saved.jsx` | recruiter | 6 (optional) |
| `/feed` | `applicant/VideoFeed.jsx` | applicant | 3 (optional) |
| `/explore` | `recruiter/ExploreCandidates.jsx` | recruiter | 3 (optional) |

Every page is styled. Pages whose backend is not built yet fall back to sample data, see below.

## The design system (`components/ui/` and `styles/ui.css`)

Added with Responsibilities 2 and 5, and now used by every page. **Reuse these instead of writing new
components or new CSS.**

| Import | What it gives you |
|---|---|
| `components/ui/primitives.jsx` | `Button`, `IconButton`, `Badge`, `Tag`, `Avatar`, `Logo`, `SelectField`, `TextField`, `Checkbox`, `Toast`, `Dialog`, `ConfirmDialog` |
| `components/ui/MatchScore.jsx` | `MatchScore` (the score ring) and `ScoreBreakdown` (score per criterion) |
| `components/ui/ResumeUpload.jsx` | resume picker with validation and progress |
| `components/ui/ResumeViewer.jsx` | shows a stored resume PDF |
| `components/ui/VideoPoster.jsx` | video thumbnail with play and pause |
| `components/AppHeader.jsx` | the top bar; pass the page title |
| `components/AuthShell.jsx` | the sign up and log in layout |
| `components/CandidateCard.jsx` | one applicant in a list |
| `components/useCandidateActions.jsx` | bookmark and invite behaviour for candidate lists |

Helpers:

- `utils/format.js` — `yearLabel`, `gpaLabel`, `internshipsLabel`, `initials`, `firstName`,
  `fileSize`, `duration`, `score`, `uploadedAgo`, `shortDate`.
- `utils/filters.js` — `EMPTY_FILTER`, `toQuery`, `fromSearch`, `fromApi`, `carry` for recruiter
  filter state shared between the filter form, the results page and saved searches.

## Styling

Plain CSS, loaded through `src/styles/index.css` in this order:

| File | What it holds |
|---|---|
| `variables.css` | colours, spacing and font tokens |
| `base.css` | element defaults |
| `layout.css` | page containers |
| `components.css` | older shared parts |
| `ui.css` | the design system (356 lines) |
| `pages.css` | profile, onboarding, results and candidate pages (317 lines) |
| `public.css` | landing, sign up and log in (158 lines) |

Use the existing class names and the tokens in `variables.css` rather than hard-coded colours, and
make layouts work at phone widths.

## Placeholder data (`data/samples.js`)

Screens whose backend belongs to a teammate and is not live yet show sample content from the Figma.
Each page calls the real endpoint first and falls back only when the route is missing;
`routeMissing(err)` checks for 404, 405 and 501.

| Page | Falls back to | Waiting on |
|---|---|---|
| `applicant/Invitations.jsx` | `sampleInvitations(email)` | Responsibility 8 |
| `recruiter/SentInvitations.jsx` | `SAMPLE_SENT` | Responsibility 8 |
| `recruiter/Saved.jsx` | `SAMPLE_SEARCHES` | Responsibility 6 |

`describeFilter(filter)` turns a filter into a readable line such as
`Computer Science · Year 3+ · GPA 3.00+ · 1+ internship · Python, SQL`.

**These screens look finished but are not.** Whoever owns the responsibility removes the fallback and
deletes this file once the real endpoints exist.

## Calling the server (`api.js`)

Always use these helpers. They add `/api`, the bearer token, and turn errors into exceptions.

```js
import { api } from "../api.js";

const options = await api.get("/options");                  // GET
await api.put("/filters/me", { min_year: 2, skills: ["Python"] });  // PUT with JSON
await api.post("/videos", formData);                        // POST a file (FormData)
await api.delete(`/videos/${id}`);                          // DELETE
```

If the server answers with an error, the helper throws an `Error` carrying the server's message and
its `status`:

```js
try {
  await api.post("/invitations", { applicant_id: 3 });
} catch (err) {
  setError(err.message);
}
```

## Logging in (Responsibility 7)

`context/AuthContext.jsx` restores the current user on mount, handles login and logout, and exposes
`useAuth()`. `api.js` sends the bearer token from tab-scoped session storage, and a 401 clears an
expired session. `App.jsx` protects the applicant and recruiter routes; the server enforces roles
independently.

`SignUp.jsx` creates the account then logs in. Recruiters go to `/find`. Applicants follow
`onboarding_step` from `/auth/me`: `profile` until the profile and resume are complete, then `video`
until the pitch exists, then `complete`.

## Saved items (Responsibility 6)

`Saved.jsx` lists saved searches and bookmarked applicants, runs and deletes searches, and removes
bookmarks. `SaveSearchButton` saves the current filter with a name on Find candidates, and accepts a
`filters` prop so Responsibility 4 can pass its form state. `BookmarkButton` is reusable on candidate
cards and is wired into `ApplicantProfile`.

The endpoints behind this page are written in `server/app/routers/saved.py` but **not mounted**, so
the page currently runs on sample data. See `responsibilities-6-7.md`.

## React patterns we use

Keep to what the course covers:

| Use | For |
|---|---|
| `useState` | form fields, loaded data, error messages |
| `useEffect` | loading data when a page opens |
| `useRef` | the `<video>` element, the camera stream, file inputs |
| `useReducer` | pages with several steps or lots of related state |
| Props | passing data into components |

No Redux and no TypeScript.

```jsx
const [results, setResults] = useState([]);
const [error, setError] = useState("");

useEffect(() => {
  api.get("/matching/results").then(setResults).catch((err) => setError(err.message));
}, []);
```

## Fixed options in forms

University, field of study, skills and year must be picked from `GET /api/options` (dropdowns and
checkboxes), never typed. There is no free-text search.

## Adding a page

1. Create the file under `src/pages/public/`, `applicant/` or `recruiter/`.
2. Add a route in `App.jsx`, inside the right `<Protected>` block.
3. Use `AppHeader` and the design system; do not invent a second set of components.
