FROM python:3.9-slim

RUN apt-get update && apt-get install -y curl bash

WORKDIR /app

# Install any additional Python packages that users might need
RUN pip install numpy pandas scipy matplotlib networkx

# Default command - keep container running
CMD ["sh", "-c", "sleep infinity"]