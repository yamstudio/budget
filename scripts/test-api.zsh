#!/usr/bin/env zsh
# Run the API integration tests against the local dev SQL Server (never prod).
# Each run creates and drops its own uniquely named database on that server.
set -euo pipefail
cd ${0:A:h}/..
scripts/dev-db.zsh up
set -a; source ${XDG_CONFIG_HOME:-$HOME/.config}/budget-dev/db.env; set +a
exec dotnet test --project tests/WebApi.Tests "$@"
