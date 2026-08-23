import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory (project root)
backend_dir = Path(__file__).resolve().parent
project_root = backend_dir.parent
load_dotenv(project_root / ".env")

TMDB_API_KEY = os.getenv("TMDB_API_KEY")

TMDB_BASE_URL = "https://api.themoviedb.org/3"

IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original"

