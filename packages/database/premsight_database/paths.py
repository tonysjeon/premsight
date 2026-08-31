from pathlib import Path


def _find_dir(sub: str) -> Path:
    for parent in Path(__file__).resolve().parents:
        repo_candidate = parent / "packages" / "database" / sub
        if repo_candidate.is_dir():
            return repo_candidate
    return Path(__file__).resolve().parent.parent / sub


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = _find_dir("migrations")
SEEDS_DIR = _find_dir("seeds")
