#!/usr/bin/env bash
# Restauración controlada en una base de pruebas, nunca automáticamente en producción.
set -euo pipefail
: "${MONGODB_URI:?Define MONGODB_URI de una base de PRUEBAS}"
: "${1:?Uso: bash scripts/restaurar-backup.sh ruta/al/respaldo.archive.gz}"
[[ -f "$1" ]] || { echo 'No existe el archivo'; exit 1; }
[[ "${CONFIRMAR_RESTAURACION:-}" == 'SI_EN_PRUEBAS' ]] || { echo 'Configura CONFIRMAR_RESTAURACION=SI_EN_PRUEBAS'; exit 1; }
# Sin --drop: evita eliminar colecciones que ya existen en la base destino.
mongorestore --uri="$MONGODB_URI" --archive="$1" --gzip
