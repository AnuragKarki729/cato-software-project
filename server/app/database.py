from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from app.config import DATABASE_URL

if DATABASE_URL.startswith("sqlite"):
    # SQLite is only used by the tests. Make sure the folder for the file exists.
    Path(DATABASE_URL.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def create_db_and_tables():
    import app.models  # noqa: F401  (loads every model so its table gets created)

    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
