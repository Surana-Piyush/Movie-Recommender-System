from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_URL = f"sqlite:///{BASE_DIR / 'movies.db'}"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
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

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    movie_id = Column(Integer, nullable=False)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

