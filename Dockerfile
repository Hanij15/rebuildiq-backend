FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
