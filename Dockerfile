# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Install system dependencies (including vips)
RUN apt-get update && \
    apt-get install -y \
    libvips-dev \
    && apt-get clean

# Set the working directory in the container (inside the backend folder)
WORKDIR /app/backend

# Copy the current directory contents into the container at /app
COPY . /app

# Install the required Python packages from backend folder
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Expose the port the app runs on
EXPOSE 8000

# Run the FastAPI app using uvicorn (adjusted to use the backend folder)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
