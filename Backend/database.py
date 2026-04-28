from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from Backend.config import DATABASE_PATH


class Database:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or DATABASE_PATH

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")

        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self, schema_path: Path, seed_path: Path) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)

        with self.connect() as connection:
            connection.executescript(schema_path.read_text(encoding="utf-8"))
            connection.executescript(seed_path.read_text(encoding="utf-8"))
