# Development image for the Vite dev server.
FROM node:20-alpine

WORKDIR /srv

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
