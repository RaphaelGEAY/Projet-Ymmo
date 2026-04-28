from __future__ import annotations

import base64
import hashlib
import hmac
import secrets


class PasswordHasher:
    algorithm = "pbkdf2_sha256"
    digest = "sha256"
    iterations = 120000
    salt_size = 16

    def hash_password(self, password: str) -> str:
        salt = secrets.token_bytes(self.salt_size)
        digest = hashlib.pbkdf2_hmac(
            self.digest,
            password.encode("utf-8"),
            salt,
            self.iterations,
        )

        return "$".join(
            [
                self.algorithm,
                str(self.iterations),
                self._encode(salt),
                self._encode(digest),
            ]
        )

    def verify_password(self, password: str, encoded_password: str) -> bool:
        try:
            algorithm, raw_iterations, salt, digest = encoded_password.split("$", 3)
        except ValueError:
            return False

        if algorithm != self.algorithm:
            return False

        computed_digest = hashlib.pbkdf2_hmac(
            self.digest,
            password.encode("utf-8"),
            self._decode(salt),
            int(raw_iterations),
        )
        return hmac.compare_digest(self._encode(computed_digest), digest)

    @staticmethod
    def _encode(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")

    @staticmethod
    def _decode(value: str) -> bytes:
        padding = "=" * (-len(value) % 4)
        return base64.urlsafe_b64decode(value + padding)
