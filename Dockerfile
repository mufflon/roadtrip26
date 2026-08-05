# Build the static site, then serve it with nginx. Published to GHCR by
# .github/workflows/container.yml for hosting on your own server.
FROM node:lts-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# On your own server the site lives at the domain root, not under a repo subpath.
ENV PATH_PREFIX=/
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/_site /usr/share/nginx/html
EXPOSE 80
