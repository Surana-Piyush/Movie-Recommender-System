from sqlalchemy import String,Integer,Column,create_engine
from sqlalchemy.orm import declarative_base,sessionmaker

DB_URL = "sqlite:///movies.db"
engine = create_engine(DB_URL)
Base = declarative_base()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


class User(Base):
    __tablename__="users"

    user_id=Column(Integer,primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

class Rating(Base):
    __tablename__ = "ratings"

    rating_id = Column(Integer, primary_key=True)
    user_id=Column(Integer)
    movie_id = Column(Integer)
    rating = Column(Integer)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

