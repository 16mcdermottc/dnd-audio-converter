FROM python:3.11-slim

# Install system dependencies (FFmpeg is critical)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Configure poetry to not create virtualenvs inside docker
RUN poetry config virtualenvs.create false

WORKDIR /app

# Copy dependency files first (caching)
COPY backend/pyproject.toml backend/poetry.lock* ./backend/
# We need to copy requirements.txt just in case or we just use poetry. 
# Since we just created pyproject.toml, we rely on it.

WORKDIR /app/backend

# Install dependencies
RUN poetry install --no-root --no-interaction --no-ansi

# Copy the rest of the backend code
# We assume the context is the repository root, so we copy backend/ -> /app/backend
COPY backend/ .

# Expose port
EXPOSE 8000

# Command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
