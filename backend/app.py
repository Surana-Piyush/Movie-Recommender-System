from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from jwt_handler import create_token
from database import get_db, User
from schema import UserCreate,UserLogin,RatingCreate
from auth import hash_password,verify_password

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db, User, Rating
from auth_dependencies import get_current_user
from schema import UserCreate, UserLogin, RatingCreate

from recommender import (
    semantic_search,
    similar_movie,
    recommend_movies
)

from schema import (
    UserCreate,
    UserLogin,
    RatingCreate,
    SemanticSearchRequest,
    SimilarMovieRequest,
    HybridRecommendationRequest
)

from tmdb import getDetails
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "Running",
        "message": "Movie Recommendation API"
    }


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

    token = create_token(existing_user)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.post("/rating")
def add_rating(
    rating: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    existing_rating = db.execute(
        select(Rating).where(
            Rating.user_id == current_user.user_id,
            Rating.movie_id == rating.movie_id
        )
    ).scalar_one_or_none()

    if existing_rating:

        existing_rating.rating = rating.rating

        db.commit()
        db.refresh(existing_rating)

        return {
            "message": "Rating updated successfully",
            "movie_id": existing_rating.movie_id,
            "rating": existing_rating.rating
        }

    new_rating = Rating(
        user_id=current_user.user_id,
        movie_id=rating.movie_id,
        rating=rating.rating
    )

    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)

    return {
        "message": "Rating added successfully",
        "movie_id": new_rating.movie_id,
        "rating": new_rating.rating
    }


@app.get("/ratings")
def get_my_ratings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    ratings = db.execute(
        select(Rating).where(
            Rating.user_id == current_user.user_id
        )
    ).scalars().all()

    return ratings

@app.delete("/rating/{movie_id}")
def delete_rating(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    rating = db.execute(
        select(Rating).where(
            Rating.user_id == current_user.user_id,
            Rating.movie_id == movie_id
        )
    ).scalar_one_or_none()

    if rating is None:
        raise HTTPException(
            status_code=404,
            detail="Rating not found"
        )

    db.delete(rating)
    db.commit()

    return {
        "message": "Rating deleted successfully"
    }

@app.post("/semantic-search")
def semantic_search_api(request: SemanticSearchRequest):

    results = semantic_search(request.query)

    movies = []

    for movie in results:

        details = getDetails(movie["title"])

        if details:
            details["score"] = movie["score"]
            movies.append(details)

    return {
        "count": len(movies),
        "results": movies
    }

@app.post("/similar-movie")
def similar_movie_api(request: SimilarMovieRequest):

    results = similar_movie(request.movie_title)

    movies = []

    for movie in results:

        details = getDetails(movie["title"])

        if details:
            details["score"] = movie["score"]
            movies.append(details)

    return {
        "count": len(movies),
        "results": movies
    }

@app.post("/recommend")
def recommend_api(request: HybridRecommendationRequest):

    results = recommend_movies(request.ratings)

    movies = []

    for movie in results:

        details = getDetails(movie["title"])

        if details:
            details["score"] = movie["score"]
            movies.append(details)

    return {
        "count": len(movies),
        "results": movies
    }

@app.get("/profile")
def get_profile(
    current_user: User = Depends(get_current_user)
):

    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email
    }
