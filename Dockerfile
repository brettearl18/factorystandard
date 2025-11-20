FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable Next telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
# If you keep a separate production env file, copy it before build:
# COPY .env.production .env.production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
COPY --from=builder /app ./
EXPOSE 8080
CMD ["npm","run","start","--","-p","8080"]

