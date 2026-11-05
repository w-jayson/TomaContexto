# ==========================================
# 1. Build Stage (Expo Web Static Bundle)
# ==========================================
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_API_URL=""
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

RUN npx expo export --platform web

# ==========================================
# 2. Runtime Stage (Caddy Web Server & Proxy)
# ==========================================
FROM caddy:2-alpine AS runtime
COPY --from=build /app/dist /srv
EXPOSE 80
EXPOSE 443
