"""Test setup: harmless placeholders so config imports; nothing here touches a real DB or API."""
import os

for key, value in {
    "PG_HOST": "localhost",
    "PG_PORT": "5432",
    "PG_USER": "test",
    "PG_PASSWORD": "test",
    "PG_DATABASE": "test",
}.items():
    os.environ.setdefault(key, value)
