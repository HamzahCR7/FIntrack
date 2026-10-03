#!/bin/sh
set -eu

phase=${1:-}
migration_url=${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}

if [ -z "$migration_url" ]; then
  echo "Set MIGRATION_DATABASE_URL (or DATABASE_URL) to the PostgreSQL connection URL." >&2
  exit 2
fi

case "$phase" in
  phase1)
    owner_username=${OWNER_USERNAME:-${ADMIN_USERNAME:-}}
    if [ -z "$owner_username" ]; then
      echo "Set OWNER_USERNAME or ADMIN_USERNAME to the existing production owner." >&2
      exit 2
    fi
    exec psql "$migration_url" \
      --set ON_ERROR_STOP=1 \
      --set owner_username="$owner_username" \
      --file prisma/migrations/ownership/phase1_add_and_backfill.sql
    ;;
  verify)
    exec psql "$migration_url" \
      --set ON_ERROR_STOP=1 \
      --file prisma/migrations/ownership/verify.sql
    ;;
  phase2)
    exec psql "$migration_url" \
      --set ON_ERROR_STOP=1 \
      --file prisma/migrations/ownership/phase2_constraints.sql
    ;;
  *)
    echo "Usage: $0 {phase1|verify|phase2}" >&2
    exit 2
    ;;
esac