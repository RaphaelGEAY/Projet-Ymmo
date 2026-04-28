import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from Backend.config import SCHEMA_PATH, SEED_PATH
from Backend.database import Database


def main() -> None:
    database = Database()
    database.initialize(SCHEMA_PATH, SEED_PATH)
    print("Database initialized:", database.path)


if __name__ == "__main__":
    main()
