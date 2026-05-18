FROM node:20-bookworm AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-bookworm AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
RUN npm install --omit=dev --workspace backend
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
COPY .env.example .env.example
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "backend"]
