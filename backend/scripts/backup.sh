#!/usr/bin/env bash
# Respaldo manual con mongodump: requiere MongoDB Database Tools y MONGODB_URI.
set -euo pipefail
: "${MONGODB_URI:?Configura MONGODB_URI antes de ejecutar}"
DESTINO="${BACKUP_DIR:-./backups}"
mkdir -p "$DESTINO"
# Permisos restrictivos: los respaldos contienen información sensible.
umask 077
ARCHIVO="$DESTINO/respaldo-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
mongodump --uri="$MONGODB_URI" --archive="$ARCHIVO" --gzip
printf 'Respaldo creado: %s\n' "$ARCHIVO"
