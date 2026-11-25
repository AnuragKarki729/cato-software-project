import logging

from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine, Session

from app.config import DATABASE_URL

log = logging.getLogger(__name__)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

# Columns added to a table that already exists.
#
# `create_all` below creates missing TABLES and nothing else: it will not add a column to a
# table it finds already there. The database lives in a named Docker volume and survives
# `docker compose down`, so every developer — and the demo machine — has an applicantprofile
# table from before these columns existed, and without this they would get "Unknown column".
#
# There is no Alembic in this project and one migration is not worth adding it for. Each entry
# is checked against the live schema and added only if missing, so this is safe on every boot
# and on a fresh database it does nothing at all.
#
# Keep a column here AND on the model. This only patches databases that predate it.
ADDED_COLUMNS = {
    "applicantprofile": {
        # Responsibility 2 (issue #5): the applicant's own privacy controls.
        "hidden": "BOOLEAN NOT NULL DEFAULT 0",
        "blocked_companies": "VARCHAR(600) NOT NULL DEFAULT ''",
    },
    "bookmark": {
        # Responsibility 6: the search a candidate was saved under, so the match score on the
        # Saved page keeps meaning the thing it meant when it was saved.
        "searched": "BOOLEAN NOT NULL DEFAULT 0",
        "field_of_study": "VARCHAR(255) NULL",
        "min_year": "INTEGER NOT NULL DEFAULT 1",
        "min_gpa": "FLOAT NOT NULL DEFAULT 0",
        "min_internships": "INTEGER NOT NULL DEFAULT 0",
        "skills": "VARCHAR(600) NOT NULL DEFAULT ''",
    },
}


def add_missing_columns():
    inspector = inspect(engine)
    for table, columns in ADDED_COLUMNS.items():
        if not inspector.has_table(table):
            continue  # create_all will build it complete
        present = {column["name"] for column in inspector.get_columns(table)}
        for name, definition in columns.items():
            if name in present:
                continue
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}"))
            log.info("added missing column %s.%s", table, name)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    add_missing_columns()

def get_session():
    with Session(engine) as session:
        yield session