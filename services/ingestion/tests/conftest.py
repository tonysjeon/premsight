def pytest_configure() -> None:
    import os

    os.environ["SCHEDULE_ENABLED"] = "false"
    from app.core.config import get_settings

    get_settings.cache_clear()
