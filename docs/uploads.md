# Uploads (videos and resumes)

Applicants upload videos (Responsibility 1) and a resume PDF (Responsibility 2). Both are saved by
one shared module, `server/app/services/storage_service.py`. Back to the [overview](overview.md).

## Where files go

| | |
|---|---|
| Saved in | Docker volume `cato-sad_uploads`, mounted at `/data/uploads` in the server container |
| Setting | `STORAGE_DIR` in `.env` |
| Served at | `http://localhost:5173/api/files/<key>` (through the client) |
| Kept when | containers stop or restart |
| Deleted by | `docker compose down -v` |

Files are not stored in the database. The database only keeps the file's **storage key**
(`video.file_location`, `applicantprofile.resume_location`). See [database.md](database.md).

## Storage keys

A key is the file's path inside the storage folder, with a random name so files never clash:

```
videos/3f2a9c1e5b7d4e0f8a6b2c1d9e8f7a6b.mp4
resumes/8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e.pdf
```

## The storage module

| Function | Does | Returns |
|---|---|---|
| `save(data, folder, extension)` | Saves the bytes in `folder` with a random name | the storage key |
| `get_url(key)` | Builds the link the browser uses to view or play the file | `"/api/files/<key>"` |
| `delete(key)` | Deletes the file (refuses keys that point outside the storage folder) | nothing |

```python
from app.services import storage_service

data = await file.read()                                   # file is a FastAPI UploadFile
key = storage_service.save(data, "videos", "mp4")          # save
video = Video(applicant_id=user.id, file_location=key, kind="pitch", duration_seconds=28.5)

url = storage_service.get_url(video.file_location)         # give this to the client
storage_service.delete(video.file_location)                # when the video is deleted
```

Always save the key in the database and return `get_url(key)` to the client. Never return the folder path.

## Rules from the project document

These are checked by the endpoints (not by the storage module):

| Rule | Where | Setting |
|---|---|---|
| Video at most 30 seconds | `POST /api/videos` | `MAX_VIDEO_SECONDS` |
| One pitch video per applicant | `POST /api/videos` | – |
| At most 5 extra videos | `POST /api/videos` | `MAX_EXTRA_VIDEOS` |
| Resume must be a PDF | `POST /api/profiles/me/resume` | – |
| Only the owner can delete a video | `DELETE /api/videos/{id}` | – |

The video length is measured in the browser when recording or choosing the file, and sent with the
upload as `duration_seconds`.

## Uploading from the client

Files are sent as `FormData`. The `api.js` helpers handle it:

```js
const form = new FormData();
form.append("file", videoFile);
form.append("kind", "pitch");
form.append("duration_seconds", duration);
const video = await api.post("/videos", form);

// play it
<video src={video.url} controls />
```

## Cloudinary

Set `CLOUDINARY_URL` in `.env` to store files in Cloudinary. Leave it empty to use the Docker volume.
Routers, models and the client stay the same either way. Never commit the real value.

## Size

30 second videos are a few MB each. A Docker volume (or R2's free 10 GB) is more than enough for the
class demo and the dummy data.
