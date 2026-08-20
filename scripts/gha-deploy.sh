#!/bin/sh

# Run on the deploy host (over SSH from the GitHub Actions workflow), from a
# checkout already sitting on the commit to deploy. Mirrors the Jenkinsfile's
# Build/Backup/Deploy/Verify stages so both pipelines agree on container
# names, ports and the Caddy upstream file — deliberately not a from-scratch
# reimplementation, to avoid the two drifting apart.

set -eu

CONTAINER_NAME="${CONTAINER_NAME:-nestjs-app}"
IMAGE_NAME="${IMAGE_NAME:-nestjs-image}"
PORT="${PORT:-3000}"
APP_DIR="${APP_DIR:-automation}"
PUBLIC_URL="${PUBLIC_URL:-https://team-sober.com}"
DATA_VOLUME="${DATA_VOLUME:-blog_data}"
ENV_FILE="${ENV_FILE:-/opt/blog/.env}"

BLUE_PORT="${BLUE_PORT:-3001}"
GREEN_PORT="${GREEN_PORT:-3002}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/caddy/upstream.conf}"

BACKUP_DIR="${BACKUP_DIR:-/opt/blog/backups}"
S3_BUCKET="${S3_BUCKET:-}"
BACKUP_KEEP="${BACKUP_KEEP:-2}"

BUILD_TAG="${BUILD_TAG:-gha-$(date -u +%Y%m%d%H%M%S)}"

log() { echo "[gha-deploy] $*"; }
fail() { echo "[gha-deploy] ERROR: $*" >&2; exit 1; }

log "Deploying $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

log "Building $IMAGE_NAME:$BUILD_TAG"
(cd "$APP_DIR" && docker build -t "$IMAGE_NAME:$BUILD_TAG" -t "$IMAGE_NAME:latest" .)

log "Running the test suite inside the built image"
docker run --rm "$IMAGE_NAME:$BUILD_TAG" npm test

if [ -f scripts/backup.sh ]; then
    set +e
    BACKUP_DIR="$BACKUP_DIR" S3_BUCKET="$S3_BUCKET" BACKUP_KEEP="$BACKUP_KEEP" \
        DATA_VOLUME="$DATA_VOLUME" sh scripts/backup.sh
    rc=$?
    set -e

    if [ "$rc" = "2" ]; then
        log "WARNING: backup skipped — see the reason above. Continuing to deploy."
    elif [ "$rc" != "0" ]; then
        fail "Backup failed (exit $rc). Refusing to deploy over unbacked-up data."
    fi
else
    log "scripts/backup.sh missing — skipping backup."
fi

docker volume create "$DATA_VOLUME" > /dev/null

if [ -r "$ENV_FILE" ]; then
    ENV_ARG="--env-file $ENV_FILE"
    log "Loading secrets from $ENV_FILE"
elif [ -f "$ENV_FILE" ]; then
    ENV_ARG=""
    log "WARNING: $ENV_FILE exists but is not readable by $(whoami). Deploying without it."
else
    ENV_ARG=""
    log "WARNING: $ENV_FILE not found — admin sign-in will be disabled."
fi

if ! sh scripts/switch-upstream.sh --check; then
    log "Blue/green switching unavailable — deploying single-container on $PORT (brief downtime)."

    docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true

    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "${PORT}:${PORT}" \
        -v "$DATA_VOLUME:/app/data" \
        $ENV_ARG \
        "$IMAGE_NAME:$BUILD_TAG"

    DEPLOYED_PORT="$PORT"
else
    ACTIVE_PORT=$(grep -o '127\.0\.0\.1:[0-9]*' "$UPSTREAM_FILE" 2>/dev/null | head -1 | cut -d: -f2)

    if [ "$ACTIVE_PORT" = "$BLUE_PORT" ]; then
        NEW_COLOR=green; NEW_PORT=$GREEN_PORT
        OLD_COLOR=blue;  OLD_PORT=$BLUE_PORT
    else
        NEW_COLOR=blue;  NEW_PORT=$BLUE_PORT
        OLD_COLOR=green; OLD_PORT=$GREEN_PORT
    fi

    NEW_NAME="${CONTAINER_NAME}-${NEW_COLOR}"
    OLD_NAME="${CONTAINER_NAME}-${OLD_COLOR}"

    log "Active upstream: ${ACTIVE_PORT:-none} — deploying $NEW_COLOR on $NEW_PORT."

    docker stop "$NEW_NAME" > /dev/null 2>&1 || true
    docker rm   "$NEW_NAME" > /dev/null 2>&1 || true

    docker run -d \
        --name "$NEW_NAME" \
        --restart unless-stopped \
        -e TRUST_PROXY=1 \
        -p "127.0.0.1:${NEW_PORT}:${PORT}" \
        -v "$DATA_VOLUME:/app/data" \
        $ENV_ARG \
        "$IMAGE_NAME:$BUILD_TAG"

    log "Waiting for $NEW_COLOR to answer on $NEW_PORT..."
    ok=""
    i=1
    while [ "$i" -le 20 ]; do
        if curl -fsS --max-time 3 "http://127.0.0.1:${NEW_PORT}/health" > /dev/null 2>&1; then
            log "  healthy after ${i} attempt(s)."
            ok="yes"
            break
        fi
        sleep 2
        i=$((i + 1))
    done

    if [ -z "$ok" ]; then
        log "$NEW_COLOR never became healthy. Logs:"
        docker logs --tail 40 "$NEW_NAME" || true
        log "Removing it. $OLD_COLOR is still serving — the site did not go down."
        docker stop "$NEW_NAME" > /dev/null 2>&1 || true
        docker rm   "$NEW_NAME" > /dev/null 2>&1 || true
        fail "Health check failed — deploy aborted, previous release still serving."
    fi

    sh scripts/switch-upstream.sh "$NEW_PORT"

    if [ "$(docker ps -q -f name="^${OLD_NAME}$")" ]; then
        log "Stopping $OLD_COLOR."
        docker stop "$OLD_NAME" > /dev/null || true
    fi

    if [ "$(docker ps -q -f name="^${CONTAINER_NAME}$")" ]; then
        if curl -fsS --max-time 10 "${PUBLIC_URL}/health" > /dev/null 2>&1; then
            log "${PUBLIC_URL} is answering — retiring the legacy single container on port $PORT."
            docker stop "$CONTAINER_NAME" > /dev/null || true
        else
            log "WARNING: ${PUBLIC_URL} is not answering — keeping the legacy container as a fallback."
        fi
    fi

    DEPLOYED_PORT="$NEW_PORT"
fi

log "Verifying on port $DEPLOYED_PORT..."
ok=""
i=1
while [ "$i" -le 20 ]; do
    if curl -fsS "http://127.0.0.1:${DEPLOYED_PORT}/health" > /dev/null 2>&1; then
        log "Health check passed after ${i} attempt(s)."
        curl -s "http://127.0.0.1:${DEPLOYED_PORT}/health"
        echo ""
        ok="yes"
        break
    fi
    sleep 2
    i=$((i + 1))
done
[ -n "$ok" ] || fail "Health check never passed after deploy."

if command -v caddy > /dev/null 2>&1; then
    if curl -fsS --max-time 10 "${PUBLIC_URL}/health" > /dev/null 2>&1; then
        log "Public URL is answering over HTTPS."
    else
        log "WARNING: ${PUBLIC_URL}/health did not answer — container is healthy, likely a proxy or certificate issue."
    fi
fi

log "Pruning old $IMAGE_NAME builds, keeping the 3 most recent."
docker images "$IMAGE_NAME" --format '{{.Tag}}' \
    | grep -v '^latest$' \
    | sort -r \
    | tail -n +4 \
    | while read -r old; do
        log "Removing $IMAGE_NAME:$old"
        docker rmi "$IMAGE_NAME:$old" || true
      done

log "Deploy complete."
