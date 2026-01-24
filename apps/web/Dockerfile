FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build for production
ENV NEXT_TELEMETRY_DISABLED 1

# Development mode by default
CMD ["npm", "run", "dev"]
