from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db, User
from schema import UserCreate
from auth import hash_password

app = FastAPI()

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):

    existing_user = db.execute(
        select(User).where(User.email == user.email)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    return {
        "Name": user.username,
        "Email": user.email
    }