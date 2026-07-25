import requests
from config import (TMDB_API_KEY,TMDB_BASE_URL,IMAGE_BASE_URL,BACKDROP_BASE_URL)

tmdb_base_url = TMDB_BASE_URL
tmdb_api = TMDB_API_KEY



def getDetails(movieName:str):
    url=f"{tmdb_base_url}/search/movie"

    param={
        "api_key":tmdb_api,
        "query":movieName
    }

    response = requests.get(url,params=param)

    if(response.status_code!=200):
        return None

    data = response.json()
    
    if not data["results"]:
        return None

    movie = data["results"][0]

    return{
        "tmdb_id":movie["id"],
        "title": movie["title"],
        "overview": movie["overview"],
        "release_date": movie["release_date"],
        "rating": movie["vote_average"],
        "poster": (
            IMAGE_BASE_URL + movie["poster_path"]
            if movie["poster_path"]
            else None
        ),
        "backdrop": (
            BACKDROP_BASE_URL + movie["backdrop_path"]
            if movie["backdrop_path"]
            else None
        )
    }

