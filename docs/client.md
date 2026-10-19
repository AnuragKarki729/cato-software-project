# Client (React + Tailwind)

The client lives in `client/`. It is a React app written in **JavaScript**, styled with
**Tailwind CSS**, and run with Vite. Back to the [overview](overview.md).

## Folder structure

```
client/
├── index.html
├── vite.config.js          Vite + Tailwind, forwards /api to the server
├── package.json
├── Dockerfile
└── src/
    ├── main.jsx            starts React and the router
    ├── App.jsx             page routes + who is logged in
    ├── api.js              api.get / post / put / delete helpers
    ├── styles.css          loads Tailwind
    ├── components/
    │   ├── NavBar.jsx      top bar, links per role, dev login dropdown
    │   └── TodoPage.jsx    "Not built yet" placeholder
    └── pages/              one file per page
```

Open it at http://localhost:5173. Changes in `src/` reload the page automatically.

## Pages

| URL | File | Who | Responsibility | Parts on the page |
|---|---|---|---|---|
| `/` | `Landing.jsx` | everyone | – | What Cato is, Sign up / Log in links ✅ |
| `/signup` | `SignUp.jsx` | everyone | 7 | Sign up form (name, email, password, role, company name) |
| `/login` | `LogIn.jsx` | everyone | 7 | Log in form |
| `/onboarding` | `Onboarding.jsx` | applicant | 2, 1 | Step 1: profile form + resume upload · Step 2: pitch video recorder |
| `/profile` | `MyProfile.jsx` | applicant | 1, 2 | Profile details + Edit, resume viewer, video gallery |
| `/invitations` | `Invitations.jsx` | applicant | 8 | Invitation cards |
| `/find` | `FindCandidates.jsx` | recruiter | 4, 5 | Filter form + ranked results list |
| `/applicants/:applicantId` | `ApplicantProfile.jsx` | recruiter | 1, 2, 8 | Profile, resume, videos (read-only) + Invite button |
| `/sent-invitations` | `SentInvitations.jsx` | recruiter | 8 | List of invited applicants |
| `/feed` | `VideoFeed.jsx` | both | 3 (optional) | Full-screen pitch videos |
| `/saved` | `Saved.jsx` | recruiter | 6 (optional) | Saved searches + bookmarks |

Each unbuilt page shows a dashed **Not built yet** box, and a comment at the top of the file lists the
endpoints it should call.

**Reused parts:** the profile details, resume viewer and video gallery appear on both `MyProfile`
and `ApplicantProfile`. Build them as components in `src/components/` so both pages can use them.

## Calling the server (`api.js`)

Always use these helpers. They add `/api`, the login header, and turn errors into exceptions.

```js
import { api } from "../api.js";

const options = await api.get("/options");                  // GET
await api.put("/filters/me", { min_year: 2, skills: ["Python"] });  // PUT with JSON
await api.post("/videos", formData);                        // POST a file (FormData)
await api.delete(`/videos/${id}`);                          // DELETE
```

If the server answers with an error, the helper throws an `Error` with the server's message:

```js
try {
  await api.post("/invitations", { applicant_id: 3 });
} catch (err) {
  setError(err.message);   // e.g. "Not built yet (Responsibility 8)"
}
```

## Logging in (for now)

Until real login (Responsibility 7) is built, the navbar has an **"Acting as (dev)"** dropdown.
Picking a dummy user saves their id in `localStorage`, and `api.js` sends it as the `X-User-Id`
header. `App.jsx` loads the current user from `GET /api/auth/me` and passes it to the navbar and pages.
The navbar shows applicant links or recruiter links depending on the role.

When real login is finished, only `api.js` (and the Sign up / Log in pages) change.

## React patterns we use

Keep to what the course covers:

| Use | For |
|---|---|
| `useState` | form fields, loaded data, error messages |
| `useEffect` | loading data when a page opens |
| `useRef` | the `<video>` element, the camera stream, file inputs |
| `useReducer` | pages with several steps or lots of related state (e.g. Onboarding) |
| Props | passing data into components |

No Redux and no TypeScript.

Loading data when a page opens:

```jsx
const [results, setResults] = useState([]);
const [error, setError] = useState("");

useEffect(() => {
  api.get("/matching/results").then(setResults).catch((err) => setError(err.message));
}, []);
```

## Styling with Tailwind

Style with Tailwind classes in `className`. There are no separate CSS files per page.

```jsx
<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
  <h2 className="text-lg font-semibold">{applicant.name}</h2>
  <p className="text-sm text-gray-500">{applicant.field_of_study} · Year {applicant.year}</p>
  <span className="rounded bg-violet-100 px-2 py-1 text-violet-700">{applicant.match_score}</span>
</div>
```

Use **violet** (`violet-600` / `violet-700`) as the main colour so pages look consistent.
Make layouts work on phone widths too (e.g. `flex-col md:flex-row`).

## Fixed options in forms

Field of study, skills and year must be picked from `GET /api/options` (dropdowns and checkboxes),
never typed. There is no free-text search.

## Adding a page

1. Create `src/pages/MyPage.jsx`.
2. Add a route in `App.jsx`: `<Route path="/my-page" element={<MyPage />} />`.
3. If it needs a navbar link, add it to `APPLICANT_LINKS` or `RECRUITER_LINKS` in `NavBar.jsx`.
