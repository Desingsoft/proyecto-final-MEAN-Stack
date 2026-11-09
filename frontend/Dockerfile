# ---- Etapa 1: compilar la aplicación Angular ----
FROM node:20-slim AS compilacion
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build -- --configuration production

# ---- Etapa 2: servir los archivos estáticos con nginx ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
