FROM python:3.11-alpine

WORKDIR /app

RUN apk add --no-cache gcc musl-dev mariadb-connector-c-dev

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

ENV FLASK_APP=app.py
ENV FLASK_ENV=development

CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
