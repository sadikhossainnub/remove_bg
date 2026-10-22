# ─── Express API Backend Dockerfile ───
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 4000

CMD ["node", "src/index.js"]
