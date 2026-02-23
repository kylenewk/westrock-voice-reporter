FROM node:20-slim

WORKDIR /app

# Copy only server files
COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

EXPOSE 3001

CMD ["node", "dist/index.js"]
