#!/bin/sh
# Prepara el administrador inicial (si se indicó) y luego arranca el servidor.
set -e

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  node scripts/crearAdmin.js "${ADMIN_NOMBRE:-Administrador}" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" \
    || echo "AVISO: no se pudo crear el administrador inicial; el servidor arrancará igualmente."
fi

exec "$@"
