from pydantic import BaseModel,EmailStr

class UserCreate(BaseModel):
    username:str
    email:EmailStr
    password:str

class RatingCreate(BaseModel):
    user_id:int
    movie_id:int
    rating:int
