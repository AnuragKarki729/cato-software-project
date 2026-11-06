FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Copy requirements file (if exists)
COPY requirements.txt ./

# Install dependencies if requirements.txt exists
RUN if [ -f "requirements.txt" ]; then pip install --no-cache-dir -r requirements.txt; fi

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]