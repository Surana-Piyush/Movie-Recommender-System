from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schema import UserCreate
from auth import hash_password
app = FastAPI()

@app.get("/register")
def home():
    return {"message": "Movie Recommendation API"}