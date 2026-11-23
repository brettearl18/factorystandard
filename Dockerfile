FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Ensure native SWC for Alpine (musl) — optional deps may be skipped in CI
RUN npm ci && npm install @next/swc-linux-x64-musl@16.1.6 --no-save

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -- --webpack

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
COPY --from=builder /app ./
EXPOSE 8080
CMD ["npm","run","start","--","-p","8080"]

