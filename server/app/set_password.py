# Responsibility 7 — Aye Myo Myat (6837919)
"""Assign a password to a seeded local demo account without deleting its data.

Run inside the server container: uv run python -m app.set_password EMAIL
Passwords are entered interactively and are never command-line arguments.
"""
import argparse
from getpass import getpass
from sqlmodel import Session, select
from app.database import engine
from app.models import AuthSession, User
from app.services.auth_service import hash_password


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('email')
    args = parser.parse_args()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == args.email.strip().lower())).first()
        if user is None:
            parser.exit(1, 'Account not found. Register it in the web app first.\n')
        password = getpass('New password (8–128 characters): ')
        if not 8 <= len(password) <= 128 or not password.strip():
            parser.exit(1, 'Password must contain 8–128 characters and cannot be blank.\n')
        if password != getpass('Confirm password: '):
            parser.exit(1, 'Passwords do not match.\n')
        user.password_hash = hash_password(password)
        session.add(user)
        for login in session.exec(select(AuthSession).where(AuthSession.user_id == user.id)).all():
            session.delete(login)
        session.commit()
    print('Password updated. Existing login sessions for this account were revoked.')


if __name__ == '__main__':
    main()
