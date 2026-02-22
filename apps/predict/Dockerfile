FROM python:3.11-slim

WORKDIR /service

COPY apps/predict/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/algorithms /packages/algorithms
COPY apps/predict/app/ app/

ENV PYTHONPATH="/service:/packages/algorithms"
ENV PREDICT_PORT=8102

EXPOSE 8102

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8102"]
