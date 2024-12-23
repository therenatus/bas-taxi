# Dockerfile
FROM node:20

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3088

CMD ["npm", "start"]
