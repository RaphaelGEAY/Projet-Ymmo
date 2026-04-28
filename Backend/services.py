from __future__ import annotations

from typing import Any

from Backend.repositories import (
    AgencyRepository,
    ContactRepository,
    PropertyFilters,
    PropertyRepository,
    RoleRepository,
    UserRepository,
)
from Backend.security import PasswordHasher


class ValidationError(Exception):
    pass


class AuthService:
    def __init__(
        self,
        user_repository: UserRepository,
        role_repository: RoleRepository,
        password_hasher: PasswordHasher,
    ) -> None:
        self.user_repository = user_repository
        self.role_repository = role_repository
        self.password_hasher = password_hasher

    def register(self, payload: dict[str, Any]) -> dict[str, Any]:
        first_name = self._required_text(payload, "first_name")
        last_name = self._required_text(payload, "last_name")
        email = self._required_text(payload, "email").lower()
        password = self._required_text(payload, "password")
        confirm_password = self._required_text(payload, "confirm_password")
        role_name = (payload.get("role") or "Client").strip() or "Client"
        phone = (payload.get("phone") or "").strip() or None

        if password != confirm_password:
            raise ValidationError("Les mots de passe ne correspondent pas.")

        if len(password) < 12:
            raise ValidationError("Le mot de passe doit contenir au moins 12 caracteres.")

        if self.user_repository.get_by_email(email) is not None:
            raise ValidationError("Un compte existe deja avec cet email.")

        role_id = self.role_repository.get_role_id(role_name)
        if role_id is None:
            raise ValidationError("Le role selectionne est inconnu.")

        user = self.user_repository.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            password_hash=self.password_hasher.hash_password(password),
            role_id=role_id,
        )
        return {"user": user}

    def login(self, payload: dict[str, Any]) -> dict[str, Any]:
        email = self._required_text(payload, "email").lower()
        password = self._required_text(payload, "password")
        expected_role = (payload.get("role") or "").strip()

        user = self.user_repository.get_by_email(email)
        if user is None:
            raise ValidationError("Compte introuvable.")

        if not self.password_hasher.verify_password(password, user["password_hash"]):
            raise ValidationError("Mot de passe invalide.")

        role_name = user.get("role_name") or "Client"
        if expected_role and expected_role != role_name:
            raise ValidationError("Le profil choisi ne correspond pas a ce compte.")

        return {
            "user": {
                "id": user["id"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "email": user["email"],
                "phone": user["phone"],
                "status": user["status"],
                "role_name": role_name,
            }
        }

    @staticmethod
    def _required_text(payload: dict[str, Any], field_name: str) -> str:
        value = str(payload.get(field_name, "")).strip()
        if not value:
            raise ValidationError(f"Le champ {field_name} est obligatoire.")
        return value


class MarketService:
    def __init__(
        self,
        property_repository: PropertyRepository,
        agency_repository: AgencyRepository,
        contact_repository: ContactRepository,
    ) -> None:
        self.property_repository = property_repository
        self.agency_repository = agency_repository
        self.contact_repository = contact_repository

    def list_properties(self, raw_filters: dict[str, Any]) -> dict[str, Any]:
        filters = PropertyFilters(
            city=(raw_filters.get("city") or "").strip() or None,
            property_type=(raw_filters.get("type") or "").strip() or None,
            max_price=self._to_int(raw_filters.get("max_price")),
            status=(raw_filters.get("status") or "").strip() or None,
        )
        items = self.property_repository.search(filters)
        return {"items": items, "count": len(items)}

    def get_dashboard(self) -> dict[str, Any]:
        overview = self.property_repository.get_market_overview()
        network = self.agency_repository.list_network()

        total_workstations = sum(site["workstations_count"] for site in network)
        agency_count = sum(1 for site in network if site["site_type"] == "Agence")

        return {
            **overview,
            "network": {
                "sites": network,
                "agency_count": agency_count,
                "total_workstations": total_workstations,
                "headquarters_city": "Aix-en-Provence",
            },
        }

    def create_contact_request(self, payload: dict[str, Any]) -> dict[str, Any]:
        full_name = self._required_text(payload, "full_name")
        email = self._required_text(payload, "email").lower()
        message = self._required_text(payload, "message")
        phone = (payload.get("phone") or "").strip() or None
        preferred_contact = (payload.get("preferred_contact") or "").strip() or None
        property_id = self._to_int(payload.get("property_id"))

        request_id = self.contact_repository.create_request(
            property_id=property_id,
            full_name=full_name,
            email=email,
            phone=phone,
            preferred_contact=preferred_contact,
            message=message,
        )

        return {"request_id": request_id}

    def list_contact_requests(self, raw_filters: dict[str, Any]) -> dict[str, Any]:
        email = (raw_filters.get("email") or "").strip().lower() or None
        limit = self._to_int(raw_filters.get("limit"))
        bounded_limit = 20 if limit is None else min(max(limit, 1), 50)

        items = self.contact_repository.list_requests(
            email=email,
            limit=bounded_limit,
        )

        status_counts: dict[str, int] = {}
        agency_counts: dict[str, int] = {}
        for item in items:
            status_name = item.get("status") or "Inconnu"
            status_counts[status_name] = status_counts.get(status_name, 0) + 1

            agency_name = item.get("agency_name") or "Agence Ymmo"
            agency_counts[agency_name] = agency_counts.get(agency_name, 0) + 1

        top_agencies = [
            {"agency_name": name, "request_count": count}
            for name, count in sorted(
                agency_counts.items(),
                key=lambda entry: (-entry[1], entry[0]),
            )[:4]
        ]

        return {
            "items": items,
            "count": len(items),
            "status_counts": status_counts,
            "top_agencies": top_agencies,
        }

    @staticmethod
    def _required_text(payload: dict[str, Any], field_name: str) -> str:
        value = str(payload.get(field_name, "")).strip()
        if not value:
            raise ValidationError(f"Le champ {field_name} est obligatoire.")
        return value

    @staticmethod
    def _to_int(value: Any) -> int | None:
        if value in (None, "", "null"):
            return None
        try:
            return int(value)
        except (TypeError, ValueError) as error:
            raise ValidationError("Une valeur numerique attendue est invalide.") from error


def build_services(database: Any) -> tuple[AuthService, MarketService]:
    user_repository = UserRepository(database)
    role_repository = RoleRepository(database)
    property_repository = PropertyRepository(database)
    agency_repository = AgencyRepository(database)
    contact_repository = ContactRepository(database)
    password_hasher = PasswordHasher()

    return (
        AuthService(user_repository, role_repository, password_hasher),
        MarketService(property_repository, agency_repository, contact_repository),
    )
