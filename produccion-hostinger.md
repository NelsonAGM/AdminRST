# Guía para desplegar Sistemas RST en Hostinger

## 1. Preparar la aplicación para producción

### Modificar el package.json:

```json
"scripts": {
  "dev": "tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}
```

### Crear un archivo .env en la raíz del proyecto:

```
DATABASE_URL=postgres://usuario:contraseña@hostinger-dbhost:5432/nombrebd
PORT=3000
SESSION_SECRET=tu_secreto_seguro_para_sesiones
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=465
EMAIL_USER=no-reply@sistemasrst.com
EMAIL_PASSWORD=tu_contraseña_email
EMAIL_FROM=no-reply@sistemasrst.com
NODE_ENV=production
```

## 2. Exportar la base de datos de Replit

Ejecuta este comando para exportar la base de datos actual:

```bash
mkdir -p backups
pg_dump -U $PGUSER -h $PGHOST -p $PGPORT -d $PGDATABASE > backups/sistemasrst_backup.sql
```

## 3. Crear y configurar hosting en Hostinger

1. Inicia sesión en tu cuenta de Hostinger
2. Crea un nuevo plan de hosting (asegúrate de que soporte Node.js)
3. Ve a la sección de Bases de Datos y crea una nueva base de datos PostgreSQL
4. Guarda las credenciales de la base de datos para actualizar el archivo .env

## 4. Transferir los archivos al servidor

### Opción 1: Usando el administrador de archivos de Hostinger
1. Comprime todo el proyecto (excluyendo node_modules)
2. Sube el archivo comprimido usando el administrador de archivos
3. Descomprime el archivo en el servidor

### Opción 2: Usando Git (recomendado)
1. Sube tu proyecto a un repositorio privado de GitHub
2. Conéctate al servidor de Hostinger por SSH
3. Clona el repositorio

```bash
git clone https://github.com/tu-usuario/sistemasrst.git
cd sistemasrst
```

## 5. Configurar la base de datos en Hostinger

1. Accede a phpMyAdmin o el gestor de bases de datos de Hostinger
2. Selecciona la base de datos PostgreSQL que creaste
3. Importa el archivo `sistemasrst_backup.sql`

## 6. Instalar dependencias y compilar la aplicación

```bash
# Instalar las dependencias
npm install

# Compilar la aplicación para producción
npm run build
```

## 7. Configurar PM2 para mantener la aplicación en ejecución

PM2 es un gestor de procesos que mantendrá tu aplicación Node.js en ejecución:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar la aplicación con PM2
pm2 start dist/index.js --name sistemasrst

# Configurar PM2 para iniciar automáticamente después de reinicios
pm2 startup
pm2 save
```

## 8. Configurar el dominio y HTTPS

1. Ve a la sección de dominios en tu panel de Hostinger
2. Asigna tu dominio al sitio web (por ejemplo: sistemasrst.com)
3. Configura los registros DNS apuntando a tu servidor
4. Activa el certificado SSL/HTTPS (Hostinger ofrece Let's Encrypt gratis)

## 9. Configurar el servidor web para redirigir al puerto de Node.js

Hostinger normalmente usa Apache o Nginx como servidor web. Necesitarás configurar un proxy inverso:

Para Nginx:
```
server {
    listen 80;
    server_name sistemasrst.com www.sistemasrst.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 10. Monitorear y solucionar problemas

- Revisa los logs de PM2: `pm2 logs sistemasrst`
- Verifica el estado: `pm2 status`
- Reinicia la aplicación después de cambios: `pm2 restart sistemasrst`

## Actualizaciones futuras

Para actualizar la aplicación:

1. Realiza los cambios en tu entorno de desarrollo
2. Prueba exhaustivamente
3. Sube los cambios a tu repositorio de GitHub
4. En el servidor:
```bash
cd sistemasrst
git pull
npm install
npm run build
pm2 restart sistemasrst
```