from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db, User
from schema import UserCreate,UserLogin,RatingCreate
from auth import hash_password,verify_password

app = FastAPI()


@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):

    # Check if email already exists
    existing_user = db.execute(
        select(User).where(User.email == user.email)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = hash_password(user.password)

    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )

    db.add(new_user)
    db.commit()

    db.refresh(new_user)

    # Return response
    return {
        "message": "User registered successfully",
        "user_id": new_user.user_id,
        "username": new_user.username,
        "email": new_user.email
    }


@app.post("/login")
def login(user:UserLogin, db: Session = Depends(get_db)):

    existing_user = db.execute(
            select(User).where(User.email == user.email)
        ).scalar_one_or_none()
    
    if existing_user is None:
        raise HTTPException(
            status_code=400,
            detail="User not found"
        )

    if not verify_password(user.password, existing_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Invalid password"
        )

    return {
        "message": "Login successful"
    }



    
