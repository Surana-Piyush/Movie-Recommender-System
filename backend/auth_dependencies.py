from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db, User
from jwt_handler import verify_token

# Reads the JWT from:
# Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    # Verify JWT
    payload = verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    # Extract user id
    user_id = payload.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    # Find user in database
    existing_user = db.execute(
        select(User).where(User.user_id == user_id)
    ).scalar_one_or_none()

    if existing_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return existing_user


def get_current_user_optional(
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="login", auto_error=False)),
    db: Session = Depends(get_db)
) -> User | None:
    if not token:
        return None
    try:
        payload = verify_token(token)
        if not payload or "user_id" not in payload:
            return None
        return db.execute(select(User).where(User.user_id == payload["user_id"])).scalar_one_or_none()
    except Exception:
        return None