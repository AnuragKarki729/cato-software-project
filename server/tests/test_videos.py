"""Responsibility 1: applicant video upload, retrieval, and deletion."""
from tests.conftest import as_user


def upload_pitch(client, applicant, **fields):
    data = {"kind": "pitch", "duration_seconds": "12.5"}
    data.update(fields)
    return client.post(
        "/api/videos",
        headers=as_user(applicant),
        data=data,
        files={"file": ("pitch.mp4", b"video-bytes", "video/mp4")},
    )


def test_applicant_can_upload_list_and_delete_pitch_video(client, users):
    applicant = users["applicant"]
    uploaded = upload_pitch(client, applicant)
    assert uploaded.status_code == 200
    video = uploaded.json()
    assert video["kind"] == "pitch"
    assert video["url"].startswith("/api/files/v1_cato/users/")

    listed = client.get(f"/api/videos/applicant/{applicant['id']}", headers=as_user(applicant))
    assert [item["id"] for item in listed.json()] == [video["id"]]
    assert client.get(f"/api/videos/{video['id']}", headers=as_user(applicant)).status_code == 200

    assert client.delete(f"/api/videos/{video['id']}", headers=as_user(applicant)).status_code == 204
    assert client.get(f"/api/videos/{video['id']}", headers=as_user(applicant)).status_code == 404


def test_video_rules(client, users):
    applicant = users["applicant"]
    recruiter = users["recruiter"]
    assert upload_pitch(client, applicant, duration_seconds="20.1").status_code == 422
    first = upload_pitch(client, applicant)
    assert first.status_code == 200
    replacement = upload_pitch(client, applicant)
    assert replacement.status_code == 200
    videos = client.get(f"/api/videos/applicant/{applicant['id']}", headers=as_user(applicant)).json()
    assert [video["id"] for video in videos] == [replacement.json()["id"]]
    assert client.post(
        "/api/videos",
        headers=as_user(recruiter),
        data={"kind": "pitch", "duration_seconds": "10"},
        files={"file": ("pitch.mp4", b"video-bytes", "video/mp4")},
    ).status_code == 403
