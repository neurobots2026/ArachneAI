FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY ai-engine /ai-engine
COPY deception-engine /deception-engine
COPY attack-simulator /attack-simulator
COPY reports /reports
COPY database /database

ENV PYTHONPATH=/app:/ai-engine:/deception-engine:/attack-simulator

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
