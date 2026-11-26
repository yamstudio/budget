#!/usr/bin/env zsh
# Run the API in Development against the local throwaway DB (never prod).
# Starts the DB if needed, injects the local connection string via environment
# (which overrides any user-secrets), then runs the API on http://localhost:5054.
set -euo pipefail
cd ${0:A:h}/..
scripts/dev-db.zsh up
set -a; source ${XDG_CONFIG_HOME:-$HOME/.config}/budget-dev/db.env; set +a
exec dotnet run --project src/WebApi --launch-profile http "$@"
