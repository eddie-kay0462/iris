FROM python:3.11-slim

# System deps for torch / faiss / PIL / open-clip
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache).
#
# The CPU wheel index matters more than it looks: plain `pip install torch` on
# Linux pulls the CUDA build and roughly 2.5 GB of nvidia-* wheels we can never
# use on a VPS with no GPU. Pointing at download.pytorch.org/whl/cpu takes the
# image from several GB down to ~1.5 GB and cuts the build time to match.
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements.txt

# Copy source code
COPY src/ ./src/

# Copy pre-trained artifacts (models + indexes)
COPY data/processed/ ./data/processed/

# Hugging Face caches downloaded weights here. The serving routes don't need
# them — sentence-transformers is only imported on the new-item cold-start and
# retrain paths — but when it is, mount a volume here so the download survives
# a container restart instead of repeating.
ENV HF_HOME=/app/.cache/huggingface

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/health > /dev/null || exit 1

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
