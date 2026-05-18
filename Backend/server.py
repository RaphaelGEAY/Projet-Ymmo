from __future__ import annotations

import json
import mimetypes
import sqlite3
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from Backend.config import PAGES_DIR
from Backend.database import Database
from Backend.services import AuthService, MarketService, ValidationError, build_services


class YmmoRequestHandler(BaseHTTPRequestHandler):
    auth_service: AuthService | None = None
    market_service: MarketService | None = None

    def do_GET(self) -> None:  # noqa: N802
        parsed_url = urlparse(self.path)

        try:
            if parsed_url.path == "/api/health":
                self._send_json(HTTPStatus.OK, {"status": "ok"})
                return

            if parsed_url.path == "/api/properties":
                filters = {
                    key: values[0]
                    for key, values in parse_qs(parsed_url.query).items()
                    if values
                }
                payload = self._require_market_service().list_properties(filters)
                self._send_json(HTTPStatus.OK, payload)
                return

            if parsed_url.path == "/api/dashboard":
                payload = self._require_market_service().get_dashboard()
                self._send_json(HTTPStatus.OK, payload)
                return

            if parsed_url.path == "/api/contact-requests":
                filters = {
                    key: values[0]
                    for key, values in parse_qs(parsed_url.query).items()
                    if values
                }
                payload = self._require_market_service().list_contact_requests(filters)
                self._send_json(HTTPStatus.OK, payload)
                return
        except ValidationError as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return

        redirect_location = self._get_clean_static_location(parsed_url.path, parsed_url.query)
        if redirect_location is not None:
            self._redirect(redirect_location)
            return

        self._serve_static(parsed_url.path)

    def do_POST(self) -> None:  # noqa: N802
        parsed_url = urlparse(self.path)

        try:
            payload = self._read_json_body()

            if parsed_url.path == "/api/auth/register":
                response = self._require_auth_service().register(payload)
                self._send_json(HTTPStatus.CREATED, response)
                return

            if parsed_url.path == "/api/auth/login":
                response = self._require_auth_service().login(payload)
                self._send_json(HTTPStatus.OK, response)
                return

            if parsed_url.path == "/api/contact-requests":
                response = self._require_market_service().create_contact_request(payload)
                self._send_json(HTTPStatus.CREATED, response)
                return
        except ValidationError as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        except sqlite3.IntegrityError as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Route inconnue."})

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_default_headers("application/json")
        self.end_headers()

    def _read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0") or 0)
        if content_length == 0:
            return {}

        raw_body = self.rfile.read(content_length).decode("utf-8")
        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            raise ValidationError("Le corps de requete doit etre au format JSON.")

        if not isinstance(payload, dict):
            raise ValidationError("Le corps de requete doit contenir un objet JSON.")

        return payload

    def _require_auth_service(self) -> AuthService:
        service = self.auth_service
        if service is None:
            raise RuntimeError("Auth service not configured.")
        return service

    def _require_market_service(self) -> MarketService:
        service = self.market_service
        if service is None:
            raise RuntimeError("Market service not configured.")
        return service

    def _serve_static(self, raw_path: str) -> None:
        target = self._resolve_static_path(raw_path)
        if target is None or not target.is_file():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Ressource introuvable."})
            return

        mime_type, _ = mimetypes.guess_type(target.name)
        content_type = mime_type or "application/octet-stream"

        content = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self._send_default_headers(content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _get_clean_static_location(self, raw_path: str, raw_query: str) -> str | None:
        if not raw_path.endswith(".html"):
            return None

        clean_path = raw_path[:-5] or "/"
        if clean_path == "/accueil":
            clean_path = "/"

        if raw_query:
            return f"{clean_path}?{raw_query}"
        return clean_path

    def _resolve_static_path(self, raw_path: str) -> Path | None:
        clean_path = raw_path or "/"
        if clean_path == "/":
            relative_path = "accueil.html"
        else:
            relative_path = clean_path.lstrip("/")

        if not relative_path:
            return None

        pages_root = PAGES_DIR.resolve()
        html_root = (pages_root / "HTML").resolve()
        js_root = (pages_root / "JS").resolve()
        suffix = Path(relative_path).suffix.lower()

        search_targets: list[tuple[Path, str]] = []
        if not suffix:
            search_targets.append((html_root, f"{relative_path}.html"))
        elif suffix in {".html", ".css"}:
            search_targets.append((html_root, relative_path))
        elif suffix == ".js":
            search_targets.append((js_root, relative_path))
        else:
            search_targets.append((pages_root, relative_path))

        for root, target_path in search_targets:
            candidate = (root / target_path).resolve()
            if root not in candidate.parents and candidate != root:
                continue
            if candidate.is_file():
                return candidate

        return None

    def _redirect(self, location: str) -> None:
        self.send_response(HTTPStatus.MOVED_PERMANENTLY)
        self.send_header("Location", location)
        self._send_default_headers("text/plain; charset=utf-8")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _send_json(self, status: HTTPStatus, payload: dict) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_default_headers("application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_default_headers(self, content_type: str) -> None:
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")


def create_server(database: Database, host: str, port: int) -> ThreadingHTTPServer:
    auth_service, market_service = build_services(database)

    handler_class = type(
        "ConfiguredYmmoRequestHandler",
        (YmmoRequestHandler,),
        {
            "auth_service": auth_service,
            "market_service": market_service,
        },
    )
    return ThreadingHTTPServer((host, port), handler_class)
