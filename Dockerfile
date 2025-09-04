# Usamos la imagen oficial de electron-builder que ya trae Wine, Mono y dependencias para cross-build
FROM electronuserland/builder:wine

# Directorio de trabajo dentro del contenedor
WORKDIR /project

# Copiamos package.json y lock primero (mejor cacheo de Docker)
COPY package.json package-lock.json* ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del proyecto
COPY . .

# Por defecto, generamos binarios para Windows y Linux
CMD ["npm", "run", "build:all"]
