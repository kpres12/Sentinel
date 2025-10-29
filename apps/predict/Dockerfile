FROM node:18-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm i --no-audit --no-fund
COPY src ./src
RUN npm run build
EXPOSE 8102
CMD ["npm","run","start"]
