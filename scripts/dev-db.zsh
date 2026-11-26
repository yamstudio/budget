#!/usr/bin/env zsh
# Manage the throwaway local SQL Server used for development and tests.
# Usage: scripts/dev-db.zsh up|down|reset|status
# The SA password is generated on first use and stored OUTSIDE the repo in
# ${XDG_CONFIG_HOME:-~/.config}/budget-dev/db.env (chmod 600). Never commit it.
set -euo pipefail

NAME=budget-dev-sql
VOLUME=budget-dev-sql-data
IMAGE=mcr.microsoft.com/mssql/server:2022-latest
PORT=14333
ENV_DIR=${XDG_CONFIG_HOME:-$HOME/.config}/budget-dev
ENV_FILE=$ENV_DIR/db.env

write_env_file() {
  mkdir -p $ENV_DIR && chmod 700 $ENV_DIR
  local pw="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')aA1!"
  umask 077
  cat > $ENV_FILE <<ENVEOF
DEV_DB_PASSWORD=$pw
ConnectionStrings__BudgetDbConnection='Server=127.0.0.1,$PORT;Database=Budget;User Id=sa;Password=$pw;TrustServerCertificate=True'
ENVEOF
}

wait_ready() {
  print "Waiting for SQL Server to accept connections..."
  for i in {1..150}; do
    if [[ "$(podman logs $NAME 2>&1)" == *"ready for client connections"* ]]; then print "Ready."; return 0; fi
    sleep 2
  done
  print -u2 "Timed out waiting for SQL Server. See: podman logs $NAME"; return 1
}

case ${1:-} in
  up)
    if podman container exists $NAME; then
      podman start $NAME >/dev/null
    else
      if podman volume exists $VOLUME && [[ ! -f $ENV_FILE ]]; then
        print -u2 "Data volume exists but $ENV_FILE is missing. Run: $0 reset"; exit 1
      fi
      [[ -f $ENV_FILE ]] || write_env_file
      source $ENV_FILE
      podman run -d --name $NAME -p 127.0.0.1:$PORT:1433 \
        -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD=$DEV_DB_PASSWORD \
        -v $VOLUME:/var/opt/mssql $IMAGE >/dev/null
    fi
    wait_ready
    print "Local DB up on 127.0.0.1:$PORT. Run the API with scripts/dev-api.zsh"
    ;;
  down) podman stop -t 30 $NAME ;;
  reset)
    podman rm -f $NAME 2>/dev/null || true
    podman volume rm -f $VOLUME 2>/dev/null || true
    rm -f $ENV_FILE
    print "Local DB removed. Run: $0 up"
    ;;
  status) podman ps -a --filter name=$NAME --format '{{.Names}} {{.Status}}' ;;
  *) print -u2 "Usage: $0 up|down|reset|status"; exit 2 ;;
esac
