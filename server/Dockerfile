FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Workspace manifests are needed for `npm ci` to match the lockfile.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w server --omit=dev

COPY server/src server/src

USER node
EXPOSE 3000
CMD ["node", "server/src/server.js"]
