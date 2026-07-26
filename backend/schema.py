from pydantic import BaseModel

class UserClass(BaseModel):
    username:str
    email:str
    password:str

class RatingClass(BaseModel):
    user_id:int
    movie_id:int
    rating:int
