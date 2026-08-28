# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base
WORKDIR /src/services/api
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /usr/local/bin/uv

FROM base AS deps
# uv parses path sources even with --no-dev. Keep the monorepo-relative
# ../../packages/database path valid inside the image.
# Compose supplies this named context; standalone:
#   docker build -f services/api/Dockerfile --build-context database=packages/database services/api
COPY --from=database . /src/packages/database
COPY pyproject.toml uv.lock README.md ./
COPY app ./app
RUN uv sync --frozen --no-dev

FROM base AS runtime
COPY --from=deps /src/services/api/.venv /src/services/api/.venv
ENV PATH="/src/services/api/.venv/bin:$PATH"
COPY app ./app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
