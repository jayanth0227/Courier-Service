FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
