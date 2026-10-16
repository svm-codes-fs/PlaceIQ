# Backend image, shared by the api, worker and beat services.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY migrations ./migrations
COPY run.py .

RUN useradd --create-home appuser
USER appuser

EXPOSE 5000
# One worker with many threads: Socket.IO connections must stay on the process that accepted them
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "64", "run:app"]
