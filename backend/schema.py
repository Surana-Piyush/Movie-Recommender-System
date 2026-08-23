from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RatingCreate(BaseModel):
    movie_id: int
    rating: int

class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 10
    offset: int = 0


class SimilarMovieRequest(BaseModel):
    movie_title: str
    limit: int = 10
    offset: int = 0


class HybridRecommendationRequest(BaseModel):
    ratings: dict[str, float]
    limit: int = 10
    offset: int = 0