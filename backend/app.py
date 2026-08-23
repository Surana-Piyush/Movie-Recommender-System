from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from concurrent.futures import ThreadPoolExecutor, as_completed

from database import get_db, User, Rating
from auth_dependencies import get_current_user
from jwt_handler import create_token
from auth import hash_password, verify_password
from schema import (
    UserCreate,
    UserLogin,
    RatingCreate,
    SemanticSearchRequest,
    SimilarMovieRequest,
    HybridRecommendationRequest
)
from tmdb import getDetails, getDetailsById

# Shared thread pool for parallel TMDB API fetching
_tmdb_executor = ThreadPoolExecutor(max_workers=20)


def _fetch_details_parallel(results: list[dict]) -> list[dict]:
    """
    Given a list of recommender results [{"title": ..., "score": ...}, ...],
    fetch TMDB details for all of them in parallel using a thread pool.
    Returns a list of enriched movie dicts preserving the original order.
    """
    if not results:
        return []

    # Submit all TMDB lookups concurrently
    future_to_idx = {}
    for idx, movie in enumerate(results):
        future = _tmdb_executor.submit(getDetails, movie["title"])
        future_to_idx[future] = (idx, movie["score"])

    # Collect results, preserving original order
    movies_by_idx: dict[int, dict] = {}
    for future in as_completed(future_to_idx):
        idx, score = future_to_idx[future]
        try:
            details = future.result()
            if details:
                details["score"] = score
                movies_by_idx[idx] = details
        except Exception:
            pass

    # Return in original ranked order
    return [movies_by_idx[i] for i in sorted(movies_by_idx.keys())]


import threading

app = FastAPI()

def _warmup_recommender():
    try:
        import recommender
        from tmdb import warmup_tmdb_session
        
        # 1. Warm up TMDB persistent HTTPS connection pool
        warmup_tmdb_session()
        
        # 2. Run dummy search query to trigger PyTorch model compilation, tensor memory allocations, and FAISS index cache warming
        recommender.semantic_search("sci-fi space movie", top_k=5)
        
        print("Recommender engine, PyTorch model, and connection pool pre-warmed successfully!")
    except Exception as e:
        print(f"Background recommender warmup note: {e}")

@app.on_event("startup")
def startup_event():
    threading.Thread(target=_warmup_recommender, daemon=True).start()

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

@app.get("/warmup")
def warmup_endpoint():
    try:
        import recommender
        from tmdb import warmup_tmdb_session
        warmup_tmdb_session()
        recommender.semantic_search("warmup query", top_k=3)
    except Exception:
        pass
    return {
        "status": "warmed",
        "message": "Neural recommender engine and connection pool ready"
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

    existing_ratings = db.execute(
        select(Rating).where(
            Rating.user_id == current_user.user_id,
            Rating.movie_id == rating.movie_id
        )
    ).scalars().all()

    if existing_ratings:
        # Update first entry and delete any duplicate rows
        primary = existing_ratings[0]
        primary.rating = rating.rating

        for extra in existing_ratings[1:]:
            db.delete(extra)

        db.commit()
        db.refresh(primary)

        return {
            "message": "Rating updated successfully",
            "movie_id": primary.movie_id,
            "rating": primary.rating
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

    ratings = db.execute(
        select(Rating).where(
            Rating.user_id == current_user.user_id,
            Rating.movie_id == movie_id
        )
    ).scalars().all()

    if not ratings:
        raise HTTPException(
            status_code=404,
            detail="Rating not found"
        )

    for r in ratings:
        db.delete(r)
    db.commit()

    return {
        "message": "Rating deleted successfully"
    }

@app.post("/semantic-search")
def semantic_search_api(request: SemanticSearchRequest):
    from recommender import semantic_search

    results = semantic_search(request.query, top_k=50)
    total_count = len(results)
    sliced_results = results[request.offset : request.offset + request.limit]
    movies = _fetch_details_parallel(sliced_results)

    return {
        "count": total_count,
        "results": movies,
        "has_more": (request.offset + len(sliced_results)) < total_count
    }

@app.post("/similar-movie")
def similar_movie_api(request: SimilarMovieRequest):
    from recommender import similar_movie

    results = similar_movie(request.movie_title, top_k=50)
    total_count = len(results)
    sliced_results = results[request.offset : request.offset + request.limit]
    movies = _fetch_details_parallel(sliced_results)

    return {
        "count": total_count,
        "results": movies,
        "has_more": (request.offset + len(sliced_results)) < total_count
    }

@app.post("/recommend")
def recommend_api(request: HybridRecommendationRequest):
    from recommender import recommend_movies

    results = recommend_movies(request.ratings, top_n=50)
    total_count = len(results)
    sliced_results = results[request.offset : request.offset + request.limit]
    movies = _fetch_details_parallel(sliced_results)

    return {
        "count": total_count,
        "results": movies,
        "has_more": (request.offset + len(sliced_results)) < total_count
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


@app.get("/movie/{tmdb_id}")
def get_movie_details(tmdb_id: int):
    from recommender import similar_movie, semantic_search

    # Get movie details from TMDB using ID
    details = getDetailsById(tmdb_id)

    if not details:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Get similar movies using the actual title, or fallback to semantic vector search
    similar_results = similar_movie(details["title"])
    if not similar_results:
        similar_results = semantic_search(details["title"])

    # Filter out seed movie before parallel fetch
    filtered = [
        m for m in similar_results
        if m["title"].strip().lower() != details["title"].strip().lower()
    ][:10]

    similar_movies = _fetch_details_parallel(filtered)

    return {
        "movie": details,
        "similar": {
            "count": len(similar_movies),
            "results": similar_movies
        }
    }

