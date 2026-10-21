FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app/server

COPY server/package*.json ./

RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY server/src ./src
COPY database/migrations /app/database/migrations

USER node

EXPOSE 4000

CMD ["node", "src/index.js"]
