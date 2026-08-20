#!/bin/sh

set -eu

URL="${HEALTH_URL:-http://127.0.0.1:3000/health}"
TIMEOUT="${HEALTH_TIMEOUT:-5}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

log() { echo "[healthcheck] $*"; }
fail() { echo "[healthcheck] ERROR: $*" >&2; }

alert() {
    msg="$1"
    fail "$msg"

    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -fsS -m "$TIMEOUT" -X POST -H 'Content-Type: application/json' \
            -d "{\"text\":\"$msg\"}" "$ALERT_WEBHOOK" > /dev/null 2>&1 \
            || fail "Could not reach ALERT_WEBHOOK to deliver the alert."
    fi
}

body="$(curl -fsS -m "$TIMEOUT" "$URL" 2>/dev/null)" || {
    alert "team-sober health check failed: $URL did not respond within ${TIMEOUT}s."
    exit 1
}

case "$body" in
    *'"status":"ok"'*)
        log "OK — $URL is healthy."
        ;;
    *)
        alert "team-sober health check failed: $URL responded without status ok. Body: $body"
        exit 1
        ;;
esac
