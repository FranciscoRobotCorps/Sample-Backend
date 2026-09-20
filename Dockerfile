# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files first (for better layer caching)
COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts --omit=dev 2>&1 || true \
    && npm ci 2>&1

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build 2>&1

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Create a non-root user for running the app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production dependencies and built output
COPY package.json package-lock.json ./
RUN npm ci --omit=dev 2>&1

COPY --from=build /app/dist/ ./dist/

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]
