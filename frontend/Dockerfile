FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/yarn.lock* ./

# Install dependencies
RUN yarn install

# Copy source
COPY frontend/ .

# Expose Vite port
EXPOSE 5173

# Run dev server with host exposure
CMD ["yarn", "dev", "--host", "0.0.0.0"]
