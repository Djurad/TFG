# Dockerfile

# 1. Imagen base
FROM node:18

# 2. Directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar package.json y package-lock.json
COPY package*.json ./

# 4. Instalar dependencias
RUN npm install

# 5. Copiar el resto del código (incluye backend y carpeta public)
COPY . .

# 6. Exponer el puerto en el que escucha el servidor
EXPOSE 3000

# 7. Comando de inicio
CMD ["sh", "-c", "sleep 10 && node backend/server.js"]

