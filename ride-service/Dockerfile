FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install

COPY . .

EXPOSE 3003

CMD ["node", "index.js"]