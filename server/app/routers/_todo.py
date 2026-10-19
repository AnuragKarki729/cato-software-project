from fastapi import HTTPException


def todo(responsibility: int) -> HTTPException:
    """Placeholder for endpoints that are not built yet."""
    return HTTPException(status_code=501, detail=f"Not built yet (Responsibility {responsibility})")
