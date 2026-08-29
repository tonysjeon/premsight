# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /usr/local/bin/uv

FROM base AS deps
RUN uv venv /app/.venv
ENV VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"
# Install runtime deps by name. Reading pyproject.toml still parses the
# monorepo path source for premsight-database, which is not in this context.
RUN uv pip install --python /app/.venv/bin/python --no-cache \
    "fastapi>=0.115.0" \
    "httpx>=0.28.0" \
    "psycopg[binary]>=3.2.0" \
    "uvicorn[standard]>=0.34.0" \
    "pydantic-settings>=2.8.0"

FROM base AS runtime
WORKDIR /app
COPY --from=deps /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

