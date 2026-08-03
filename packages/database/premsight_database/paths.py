from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = PACKAGE_ROOT / "migrations"
SEEDS_DIR = PACKAGE_ROOT / "seeds"
