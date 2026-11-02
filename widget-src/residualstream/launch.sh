#!/usr/bin/env bash
# Single entrypoint for running jobs, either directly on a dev node or
# on cloud compute via SkyPilot.
#
#   launch.sh --local <TARGET.py> [ARGS...]
#       Bootstrap (secrets + unbuffered I/O) then exec TARGET in this
#       process. Used both when you run it yourself on a dev node, and as
#       the `run:` step inside a SkyPilot yaml (in which case it's the
#       same code path, just executing on the remote pod instead). Scripts
#       that need R2 talk to it via dkexpt.r2 (S3 API), not a mounted path.
#
#   launch.sh --sky <RUN_NAME> <YAML_FILE>
#       Submit YAML_FILE to SkyPilot as RUN_NAME and tail its logs. Only
#       ever runs on your local machine; the remote job it launches is
#       expected to bootstrap itself via `--local` (see single_gpu.yaml).
set -euo pipefail

SECRETS_FILE="$HOME/.config/r2/secrets.env"

usage() {
  cat >&2 <<EOF
Usage:
  $0 --local <TARGET.py> [ARGS...]
  $0 --sky <RUN_NAME> <YAML_FILE>
EOF
  exit 1
}

# Auto-sources $SECRETS_FILE so you never have to remember to `source` it
# yourself. Both modes go through here so the two paths can't drift.
load_secrets() {
  if [[ -f "$SECRETS_FILE" ]]; then
    set -a
    source "$SECRETS_FILE"
    set +a
  fi
}

require_vars() {
  local missing=()
  local v
  for v in "$@"; do
    [[ -n "${!v:-}" ]] || missing+=("$v")
  done
  if (( ${#missing[@]} )); then
    echo "$0: missing required env var(s): ${missing[*]}" >&2
    echo "$0: set them in $SECRETS_FILE, or pass them through the SkyPilot yaml." >&2
    exit 1
  fi
}

[[ $# -ge 1 ]] || usage
MODE="$1"
shift

case "$MODE" in
  --local)
    [[ $# -ge 1 ]] || usage

    # No-op remotely: SkyPilot's `secrets:`/`envs:` already put these in the
    # env before this script runs, so there's nothing to source.
    if [[ -z "${R2_ACCESS_KEY_ID:-}" ]]; then
      load_secrets
    fi
    require_vars R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET R2_ENDPOINT_URL

    # `exec` replaces this process rather than spawning a child, so the
    # real script inherits stdout/stderr directly, and `-u` keeps it
    # unbuffered so logs stream in real time. `uv run` is what puts the
    # project's .venv (built by `uv sync` in setup) on the interpreter
    # path - a bare `python` would silently be the image's base env.
    exec uv run --frozen python -u "$@"
    ;;
  --sky)
    [[ $# -eq 2 ]] || usage
    RUNNAME="$1"
    YAMLFILE="$2"

    load_secrets
    require_vars R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY

    # -d submits and returns (`sky launch` otherwise streams logs itself, and
    # the `sky logs` below would then just replay them a second time).
    # -i/--down: tear the cluster down 10 idle minutes after the job ends, so
    # a finished run stops billing whether or not you remember to `sky down`.
    sky launch -d -i 10 --down -c "$RUNNAME" "$YAMLFILE" \
      --secret R2_ACCESS_KEY_ID --secret R2_SECRET_ACCESS_KEY
    sky logs "$RUNNAME" --follow      # real-time stdout/stderr
    ;;
  *)
    usage
    ;;
esac
