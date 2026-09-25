#!/bin/sh
# Local Worker on port 8787 (fails if busy). Hyperdrive needs a real Postgres URL locally: the Neon dev
# branch's direct URL, read from ~/.secrets/projects.env unless already set. Never written into the repo.
set -eu
if [ -z "${CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:-}" ] && [ -f "$HOME/.secrets/projects.env" ]; then
  CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="$(grep '^FRICTION_TELEMETRY__DATABASE_URL=' "$HOME/.secrets/projects.env" | cut -d= -f2-)"
  export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
fi
exec wrangler dev --port 8787 "$@"
