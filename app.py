import os

from Backend.config import DEFAULT_HOST, DEFAULT_PORT, SCHEMA_PATH, SEED_PATH
from Backend.database import Database
from Backend.server import create_server


def main() -> None:
    host = os.environ.get("YMMO_HOST", DEFAULT_HOST)
    port = int(os.environ.get("YMMO_PORT", DEFAULT_PORT))

    database = Database()
    database.initialize(SCHEMA_PATH, SEED_PATH)

    server = create_server(database, host, port)
    print(f"Ymmo server running on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
