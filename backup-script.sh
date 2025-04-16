#!/bin/bash

# Crear directorio de backups si no existe
mkdir -p backups

# Obtener fecha actual para el nombre del archivo
DATE=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="backups/sistemasrst-${DATE}.sql"

# Exportar la base de datos usando las variables de entorno
echo "Exportando base de datos a ${BACKUP_FILE}..."
pg_dump -U $PGUSER -h $PGHOST -p $PGPORT -d $PGDATABASE > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Backup completado exitosamente en: ${BACKUP_FILE}"
  echo "Tamaño del archivo: $(du -h $BACKUP_FILE | cut -f1)"
else
  echo "Error al crear el backup"
  exit 1
fi

# Crear un archivo comprimido del código fuente (excluyendo node_modules, dist, etc.)
CODE_BACKUP="backups/sistemasrst-code-${DATE}.tar.gz"
echo "Creando backup del código fuente en ${CODE_BACKUP}..."

tar --exclude="./node_modules" --exclude="./dist" --exclude="./backups" --exclude="./.git" -czf $CODE_BACKUP .

if [ $? -eq 0 ]; then
  echo "Backup del código completado exitosamente en: ${CODE_BACKUP}"
  echo "Tamaño del archivo: $(du -h $CODE_BACKUP | cut -f1)"
else
  echo "Error al crear el backup del código"
  exit 1
fi

echo "Proceso de backup completado."