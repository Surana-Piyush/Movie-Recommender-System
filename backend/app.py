import sys
import traceback

try:
    from fastapi import FastAPI, Depends, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from sqlalchemy.orm import Session
    from sqlalchemy import select
    from concurrent.futures import ThreadPoolExecutor, as_completed

    from database import get_db, User, Rating, Watchlist
    from auth_dependencies import get_current_user, get_current_user_optional
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
except Exception as _startup_err:
    print("=" * 60, file=sys.stderr)
    print("CRITICAL MODULE IMPORT ERROR DURING APP STARTUP:", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    sys.stderr.flush()
    raise _startup_err

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

    # If results are already formatted with full local details, return immediately without network calls
    if isinstance(results[0], dict) and "tmdb_id" in results[0] and ("poster" in results[0] or "overview" in results[0]):
        return results

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
    allow_credentials=False,
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
    from recommender import get_movie_by_id

    ratings = db.execute(
        select(Rating).where(
            Rating.user_id == current_user.user_id
        )
    ).scalars().all()

    enriched_ratings = []
    for r in ratings:
        details = get_movie_by_id(r.movie_id) or getDetailsById(r.movie_id)
        title = details["title"] if details else f"Movie #{r.movie_id}"
        poster = details.get("poster") if details else None
        backdrop = details.get("backdrop") if details else None
        release_date = details.get("release_date") if details else ""

        enriched_ratings.append({
            "id": r.rating_id,
            "rating_id": r.rating_id,
            "user_id": r.user_id,
            "movie_id": r.movie_id,
            "rating": r.rating,
            "title": title,
            "poster": poster,
            "backdrop": backdrop,
            "release_date": release_date
        })

    return enriched_ratings

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


@app.get("/watchlist")
def get_my_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from recommender import get_movie_by_id

    items = db.execute(
        select(Watchlist).where(Watchlist.user_id == current_user.user_id)
    ).scalars().all()

    enriched_watchlist = []
    for item in items:
        details = get_movie_by_id(item.movie_id) or getDetailsById(item.movie_id)
        title = details["title"] if details else f"Movie #{item.movie_id}"
        poster = details.get("poster") if details else None
        backdrop = details.get("backdrop") if details else None
        release_date = details.get("release_date") if details else ""
        rating = details.get("rating", 0.0) if details else 0.0

        enriched_watchlist.append({
            "id": item.id,
            "user_id": item.user_id,
            "movie_id": item.movie_id,
            "title": title,
            "poster": poster,
            "backdrop": backdrop,
            "release_date": release_date,
            "vote_average": rating,
        })

    return enriched_watchlist


@app.post("/watchlist/{movie_id}")
def add_to_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.user_id,
            Watchlist.movie_id == movie_id
        )
    ).scalar_one_or_none()

    if existing:
        return {"message": "Already in watchlist", "movie_id": movie_id}

    item = Watchlist(user_id=current_user.user_id, movie_id=movie_id)
    db.add(item)
    db.commit()
    db.refresh(item)

    return {"message": "Added to watchlist", "movie_id": movie_id}


@app.delete("/watchlist/{movie_id}")
def remove_from_watchlist(
    movie_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.user_id,
            Watchlist.movie_id == movie_id
        )
    ).scalars().all()

    if not items:
        raise HTTPException(status_code=404, detail="Watchlist item not found")

    for item in items:
        db.delete(item)
    db.commit()

    return {"message": "Removed from watchlist", "movie_id": movie_id}

@app.post("/semantic-search")
def semantic_search_api(request: SemanticSearchRequest):
    from recommender import semantic_search

    results = semantic_search(request.query, top_k=50, language=request.language)
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

    results = similar_movie(request.movie_title, top_k=50, language=request.language)
    total_count = len(results)
    sliced_results = results[request.offset : request.offset + request.limit]
    movies = _fetch_details_parallel(sliced_results)

    return {
        "count": total_count,
        "results": movies,
        "has_more": (request.offset + len(sliced_results)) < total_count
    }

@app.post("/recommend")
def recommend_api(
    request: HybridRecommendationRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    from recommender import recommend_movies, get_movie_by_id

    ratings_dict = dict(request.ratings) if request.ratings else {}

    # If no ratings payload provided, automatically pull logged-in user's database ratings
    if not ratings_dict and current_user:
        user_ratings = db.execute(
            select(Rating).where(Rating.user_id == current_user.user_id)
        ).scalars().all()
        for r in user_ratings:
            details = get_movie_by_id(r.movie_id) or getDetailsById(r.movie_id)
            if details and details.get("title"):
                ratings_dict[details["title"]] = float(r.rating)

    results = recommend_movies(ratings_dict, top_n=50, language=request.language)
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
    from recommender import similar_movie, semantic_search, get_movie_by_id

    # 1. Try local dataset lookup first, or fallback to TMDB API
    details = get_movie_by_id(tmdb_id)
    if not details:
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

