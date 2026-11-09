#!/usr/bin/env bash
# Verifica la restauración en una base aislada y cuenta documentos restaurados.
set -euo pipefail
: "${MONGODB_URI:?Indica URI de origen}" 
: "${MONGODB_TEST_URI:?Indica URI de pruebas diferente a producción}"
[[ "$MONGODB_URI" != "$MONGODB_TEST_URI" ]] || { echo 'ERROR: origen y destino son iguales'; exit 1; }
: "${1:?Uso: bash scripts/probar-restauracion.sh respaldo.archive.gz}"
[[ -f "$1" ]] || { echo 'No existe el respaldo'; exit 1; }
command -v mongorestore >/dev/null || { echo 'Instala MongoDB Database Tools'; exit 1; }
# No se usa --drop: solo se recomienda una base de pruebas VACÍA.
CONFIRMAR_RESTAURACION=SI_EN_PRUEBAS MONGODB_URI="$MONGODB_TEST_URI" bash "$(dirname "$0")/restaurar-backup.sh" "$1"
echo 'Restauración finalizada. Verifica recuentos y relaciones en la base de pruebas.'
