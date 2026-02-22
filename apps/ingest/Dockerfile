FROM python:3.11-slim

WORKDIR /service

COPY apps/ingest/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ingest/app/ app/

ENV INGEST_PORT=8103

EXPOSE 8103

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8103"]
