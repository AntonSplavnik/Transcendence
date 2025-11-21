FROM node:20-alpine AS builder
WORKDIR /srv/app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build:ts

FROM node:20-alpine
WORKDIR /srv/app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /srv/app/dist ./dist
COPY db ./db
RUN chown -R node:node /srv/app && mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["npx", "fastify", "start", "-l", "info", "dist/app.js"]
