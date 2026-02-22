FROM python:3.11-slim

WORKDIR /service

# Install Python deps
COPY apps/triangulate/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared algorithms package
COPY packages/algorithms /packages/algorithms

# Copy service code
COPY apps/triangulate/app/ app/

ENV PYTHONPATH="/service:/packages/algorithms"
ENV TRIANGULATE_PORT=8101

EXPOSE 8101

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8101"]
