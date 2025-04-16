# Guía de Despliegue para Sistemas RST en Hostinger

## Requisitos previos
- Cuenta en Hostinger con soporte para Node.js
- Acceso a la base de datos PostgreSQL (Hostinger ofrece bases de datos PostgreSQL)
- Cliente FTP o acceso SSH al servidor

## Paso 1: Exportar la base de datos de Replit

1. En Replit, ejecuta el siguiente comando para exportar la base de datos:
```bash
pg_dump -U $PGUSER -h $PGHOST -p $PGPORT -d $PGDATABASE > sistemasrst_backup.sql
```

2. Descarga el archivo `sistemasrst_backup.sql` desde Replit a tu computadora local

## Paso 2: Preparar el código para producción

1. Descarga todo el código fuente desde Replit a tu computadora local
2. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables (ajusta según la configuración de Hostinger):

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

3. Modifica el archivo `package.json` para incluir scripts de producción:

```json
"scripts": {
  "dev": "tsx server/index.ts",
  "build": "tsc && vite build",
  "start": "node dist/server/index.js",
  "postinstall": "npm run build"
}
```

4. Asegúrate de que en el archivo `vite.config.ts` la configuración esté correcta para producción

## Paso 3: Configurar el servidor en Hostinger

1. Accede al panel de control de Hostinger y crea un nuevo sitio web
2. Habilita Node.js para el sitio web (verifica que la versión sea compatible, preferiblemente Node.js 18 o superior)
3. Crea una base de datos PostgreSQL desde el panel de Hostinger
4. Importa el archivo `sistemasrst_backup.sql` a la base de datos recién creada

## Paso 4: Subir y desplegar la aplicación

1. Usando FTP o SSH, sube todos los archivos de tu proyecto a la carpeta del sitio web en Hostinger
2. Conecta por SSH y navega a la carpeta del proyecto
3. Ejecuta los siguientes comandos:

```bash
npm install
npm run build
npm run start
```

4. Configura un servicio para mantener la aplicación en ejecución (Hostinger puede ofrecer PM2 o similar)

```bash
# Instalar PM2 si no está disponible
npm install -g pm2

# Iniciar la aplicación con PM2
pm2 start dist/server/index.js --name sistemasrst

# Configurar PM2 para iniciar automáticamente tras reinicios
pm2 startup
pm2 save
```

5. Configura el dominio y/o subdominio para que apunte a la aplicación Node.js

## Paso 5: Pruebas finales

1. Accede a la aplicación a través del dominio configurado
2. Verifica que todas las funcionalidades estén trabajando correctamente:
   - Inicio de sesión
   - Gestión de órdenes de servicio
   - Notificaciones por correo electrónico
   - Generación de reportes

## Solución de problemas comunes

### Si la base de datos no se conecta:
- Verifica que las credenciales en el archivo `.env` sean correctas
- Asegúrate de que la IP del servidor esté autorizada en la configuración de PostgreSQL

### Si hay problemas con los correos electrónicos:
- Confirma que las credenciales SMTP sean correctas
- Verifica los logs del servidor para mensajes de error específicos

### Si la aplicación no inicia:
- Revisa los logs de Node.js/PM2
- Verifica que Node.js esté correctamente configurado en Hostinger
- Asegúrate de que todos los paquetes se instalaron correctamente

## Mantenimiento

Para futuras actualizaciones:

1. Actualiza el código en tu entorno de desarrollo
2. Prueba completamente en Replit
3. Exporta la base de datos si hubo cambios estructurales
4. Sube los nuevos archivos al servidor de producción
5. Reinicia la aplicación: `pm2 restart sistemasrst`