# Iris log alerts → Telegram. Small on purpose: a few threads and some regexes.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY *.py ./
RUN rm -f test_*.py && useradd --system --uid 10001 alerts
# No Docker socket in here — it talks to docker-proxy over TCP — so there is
# nothing that needs root.
USER alerts

CMD ["python", "main.py"]
