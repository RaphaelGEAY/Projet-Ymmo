from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from Backend.database import Database


@dataclass(slots=True)
class PropertyFilters:
    city: str | None = None
    property_type: str | None = None
    max_price: int | None = None
    status: str | None = None


class RoleRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def get_role_id(self, role_name: str) -> int | None:
        query = "SELECT id FROM roles WHERE name = ?"
        with self.database.connect() as connection:
            row = connection.execute(query, (role_name,)).fetchone()
        return None if row is None else int(row["id"])


class UserRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def get_by_email(self, email: str) -> dict[str, Any] | None:
        query = """
            SELECT
                users.id,
                users.first_name,
                users.last_name,
                users.email,
                users.phone,
                users.password_hash,
                users.status,
                roles.name AS role_name
            FROM users
            LEFT JOIN user_roles ON user_roles.user_id = users.id
            LEFT JOIN roles ON roles.id = user_roles.role_id
            WHERE lower(users.email) = lower(?)
            LIMIT 1
        """
        with self.database.connect() as connection:
            row = connection.execute(query, (email,)).fetchone()
        return None if row is None else dict(row)

    def create(
        self,
        *,
        first_name: str,
        last_name: str,
        email: str,
        phone: str | None,
        password_hash: str,
        role_id: int | None,
    ) -> dict[str, Any]:
        with self.database.connect() as connection:
            cursor = connection.execute(
                """
                    INSERT INTO users (
                        first_name,
                        last_name,
                        email,
                        phone,
                        password_hash
                    )
                    VALUES (?, ?, ?, ?, ?)
                """,
                (first_name, last_name, email, phone, password_hash),
            )
            user_id = cursor.lastrowid

            if role_id is not None:
                connection.execute(
                    "INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
                    (user_id, role_id),
                )

            row = connection.execute(
                """
                    SELECT
                        users.id,
                        users.first_name,
                        users.last_name,
                        users.email,
                        users.phone,
                        users.status,
                        roles.name AS role_name
                    FROM users
                    LEFT JOIN user_roles ON user_roles.user_id = users.id
                    LEFT JOIN roles ON roles.id = user_roles.role_id
                    WHERE users.id = ?
                """,
                (user_id,),
            ).fetchone()

        return dict(row)


class PropertyRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def search(self, filters: PropertyFilters) -> list[dict[str, Any]]:
        clauses = []
        params: list[Any] = []

        if filters.city:
            clauses.append("lower(p.city) LIKE ?")
            params.append(f"%{filters.city.lower()}%")

        if filters.property_type:
            clauses.append("lower(p.type) = ?")
            params.append(filters.property_type.lower())

        if filters.max_price is not None:
            clauses.append("p.price <= ?")
            params.append(filters.max_price)

        if filters.status:
            clauses.append("lower(p.status) = ?")
            params.append(filters.status.lower())

        where_clause = ""
        if clauses:
            where_clause = "WHERE " + " AND ".join(clauses)

        query = f"""
            SELECT
                p.id,
                p.reference,
                p.title,
                p.type,
                p.city,
                p.postal_code,
                p.price,
                p.surface_m2,
                p.rooms,
                p.status,
                p.description,
                p.energy_class,
                a.name AS agency_name,
                a.region,
                COALESCE(pm.url, '') AS primary_media_url,
                COALESCE(metrics.monthly_views, 0) AS monthly_views,
                COALESCE(metrics.buyer_interest_score, 0) AS buyer_interest_score,
                COALESCE(metrics.estimated_days_on_market, 0) AS estimated_days_on_market,
                COALESCE(metrics.estimated_rent_yield, 0) AS estimated_rent_yield,
                COALESCE(metrics.district_score, 0) AS district_score
            FROM properties p
            LEFT JOIN agencies a ON a.id = p.agency_id
            LEFT JOIN property_media pm
                ON pm.property_id = p.id
                AND pm.is_primary = 1
            LEFT JOIN property_metrics metrics
                ON metrics.property_id = p.id
            {where_clause}
            ORDER BY
                CASE p.status
                    WHEN 'Disponible' THEN 0
                    WHEN 'Sous offre' THEN 1
                    ELSE 2
                END,
                COALESCE(metrics.buyer_interest_score, 0) DESC,
                p.price DESC
            LIMIT 24
        """

        with self.database.connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def get_market_overview(self) -> dict[str, Any]:
        with self.database.connect() as connection:
            summary = connection.execute(
                """
                    SELECT
                        COUNT(*) AS total_properties,
                        SUM(CASE WHEN status = 'Disponible' THEN 1 ELSE 0 END) AS available_properties,
                        ROUND(AVG(price), 0) AS average_price,
                        ROUND(AVG(COALESCE(surface_m2, 0)), 0) AS average_surface
                    FROM properties
                """
            ).fetchone()

            analytics = connection.execute(
                """
                    SELECT
                        ROUND(AVG(COALESCE(monthly_views, 0)), 0) AS average_views,
                        ROUND(AVG(COALESCE(buyer_interest_score, 0)), 1) AS average_interest,
                        ROUND(AVG(COALESCE(estimated_days_on_market, 0)), 0) AS average_days_on_market
                    FROM property_metrics
                """
            ).fetchone()

            hotspots = connection.execute(
                """
                    SELECT
                        p.city,
                        COUNT(*) AS property_count,
                        ROUND(AVG(p.price), 0) AS average_price,
                        ROUND(AVG(COALESCE(metrics.buyer_interest_score, 0)), 1) AS interest_score,
                        ROUND(AVG(COALESCE(metrics.estimated_rent_yield, 0)), 1) AS rent_yield,
                        ROUND(AVG(COALESCE(metrics.estimated_days_on_market, 0)), 0) AS days_on_market
                    FROM properties p
                    LEFT JOIN property_metrics metrics
                        ON metrics.property_id = p.id
                    GROUP BY p.city
                    ORDER BY interest_score DESC, rent_yield DESC, average_price ASC
                    LIMIT 4
                """
            ).fetchall()

            price_by_type = connection.execute(
                """
                    SELECT
                        type,
                        COUNT(*) AS property_count,
                        ROUND(AVG(price), 0) AS average_price
                    FROM properties
                    GROUP BY type
                    ORDER BY average_price DESC
                """
            ).fetchall()

            recent_sales = connection.execute(
                """
                    SELECT
                        city,
                        property_type,
                        sale_price,
                        surface_m2,
                        sold_at
                    FROM sales_history
                    ORDER BY sold_at DESC
                    LIMIT 6
                """
            ).fetchall()

        return {
            "summary": dict(summary),
            "analytics": dict(analytics),
            "hotspots": [dict(row) for row in hotspots],
            "price_by_type": [dict(row) for row in price_by_type],
            "recent_sales": [dict(row) for row in recent_sales],
        }


class AgencyRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def list_network(self) -> list[dict[str, Any]]:
        query = """
            SELECT
                agencies.name,
                agencies.city,
                agencies.region,
                agencies.phone,
                agencies.email,
                network_sites.site_type,
                network_sites.workstations_count,
                network_sites.printers_count,
                network_sites.vpn_enabled,
                network_sites.notes
            FROM agencies
            INNER JOIN network_sites ON network_sites.agency_id = agencies.id
            ORDER BY
                CASE network_sites.site_type
                    WHEN 'Siege' THEN 0
                    ELSE 1
                END,
                agencies.city ASC
        """
        with self.database.connect() as connection:
            rows = connection.execute(query).fetchall()
        return [dict(row) for row in rows]


class ContactRepository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def list_requests(
        self,
        *,
        email: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        clauses = []
        params: list[Any] = []

        if email:
            clauses.append("lower(cr.email) = lower(?)")
            params.append(email)

        where_clause = ""
        if clauses:
            where_clause = "WHERE " + " AND ".join(clauses)

        query = f"""
            SELECT
                cr.id,
                cr.full_name,
                cr.email,
                cr.phone,
                cr.preferred_contact,
                cr.message,
                cr.status,
                cr.created_at,
                cr.property_id,
                COALESCE(p.reference, '') AS property_reference,
                COALESCE(p.title, 'Bien non precise') AS property_title,
                COALESCE(p.city, 'Ville non precise') AS property_city,
                COALESCE(a.name, 'Agence Ymmo') AS agency_name
            FROM contact_requests cr
            LEFT JOIN properties p ON p.id = cr.property_id
            LEFT JOIN agencies a ON a.id = p.agency_id
            {where_clause}
            ORDER BY datetime(cr.created_at) DESC, cr.id DESC
            LIMIT ?
        """

        params.append(limit)
        with self.database.connect() as connection:
            rows = connection.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def create_request(
        self,
        *,
        property_id: int | None,
        full_name: str,
        email: str,
        phone: str | None,
        preferred_contact: str | None,
        message: str,
    ) -> int:
        with self.database.connect() as connection:
            cursor = connection.execute(
                """
                    INSERT INTO contact_requests (
                        property_id,
                        full_name,
                        email,
                        phone,
                        preferred_contact,
                        message
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    property_id,
                    full_name,
                    email,
                    phone,
                    preferred_contact,
                    message,
                ),
            )
        return int(cursor.lastrowid)
