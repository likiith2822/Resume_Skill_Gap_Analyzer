"""
User data model for authentication.
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class UserModel:
    id: Optional[int] = None
    name: str = ""
    email: str = ""
    password_hash: str = ""
    created_at: Optional[str] = None

    def to_dict(self, include_hash: bool = False) -> dict:
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at
        }
        if include_hash:
            data["password_hash"] = self.password_hash
        return data
