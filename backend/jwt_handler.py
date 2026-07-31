import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from dotenv import load_dotenv
from database import User

load_dotenv()

secret_key = os.getenv("SECRET_KEY")
algorithm = "HS256"
access_token_expire_min = 43800



def create_token(user:User):

    payload={
    "user_id":user.user_id,
    "email":user.email,
    "exp":datetime.now()+timedelta(minutes=access_token_expire_min)
    }

    token = jwt.encode(
        payload,
        secret_key,
        algorithm=algorithm
    )

    return token

def verify_token(token):

    try:
        decode = jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm]
        )

        return decode

    except JWTError:
        return None 

