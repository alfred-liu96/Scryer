"""
Repositories Package

包含所有数据访问层的 Repository 实现
"""

from .base import BaseRepository
from .user import UserRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
]
