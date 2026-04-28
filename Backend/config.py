from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT_DIR / "Pages"
DATABASE_DIR = ROOT_DIR / "Database"
DATABASE_PATH = DATABASE_DIR / "ymmo.sqlite"
SCHEMA_PATH = DATABASE_DIR / "schema.sql"
SEED_PATH = DATABASE_DIR / "seed.sql"

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000
