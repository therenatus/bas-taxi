# Используем Node.js LTS версию
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /usr/src/app
# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем исходный код приложения
COPY . .

# Открываем порт
EXPOSE 3055

# Запускаем приложение
CMD ["npm", "start"]
