# Running the Project in Docker (Local)

A complete, start-to-finish guide: opening Docker Desktop, building the
image, running the container locally, and setting the admin password and
related credentials via environment variables.

**Keywords:** docker, docker desktop, docker build, docker run, container,
ADMIN_PASSWORD, AUTH_SECRET, SESSION_SECRET, admin login, admin credentials,
admin accounts, multiple admins, forgot password, local development, volume,
port mapping, troubleshooting

---

## Prerequisites

- Docker Desktop installed
- This repo cloned locally

All build/run commands are run from the `automation/` folder, where the
[Dockerfile](../automation/Dockerfile) lives.

```powershell
cd "c:\Users\Saidul islam rajib.BS-01696\Desktop\SoberProjects\team-sober\automation"
```

---

## Steps

### 1. Open Docker Desktop

Launch Docker Desktop from the Start Menu, or check whether it's already
running:

```powershell
Get-Process | Where-Object { $_.ProcessName -match "Docker Desktop|com.docker" }
```

If processes are listed but you don't see the window, Docker Desktop is
running in the background/tray — closing its window does not quit it, it
keeps the engine alive. Click the Docker whale icon in the system tray
(bottom-right of the taskbar, under the **^** hidden-icons arrow) to bring the
window forward, or relaunch it from the Start Menu (it will focus the
existing window rather than starting a second copy).

**If no window appears at all** (stuck/crashed), do a full restart:

```powershell
# 1. Stop every Docker Desktop process
Get-Process | Where-Object { $_.ProcessName -match "Docker Desktop|com.docker" } | Stop-Process -Force

# 2. Relaunch it
Start-Process "C:\Program Files\Docker\Docker\frontend\Docker Desktop.exe"
```

Give it 15–30 seconds to fully initialize. Confirm the engine is ready with:

```powershell
docker info
```

If this returns cluster/engine details instead of an error, Docker is ready
— you can proceed even if you never see the GUI window, since all commands
below only need the engine, not the dashboard.

### 2. Build the image

```powershell
docker build -t team-sober-automation .
```

### 3. Run the container

```powershell
docker run -d --name team-sober -p 3000:3000 -e ADMIN_PASSWORD="your-password-here" -e AUTH_SECRET="a-random-string-at-least-32-characters-long" -v team-sober-data:/app/data team-sober-automation
```

- `-p 3000:3000` — exposes the app at http://localhost:3000. If port 3000 is
  already in use on your machine (e.g. a local `npm run start`), either stop
  that process or change the left side of the mapping, e.g. `-p 3001:3000`.
  To find what's holding port 3000:
  ```powershell
  netstat -ano | findstr ":3000" | findstr "LISTENING"
  tasklist /FI "PID eq <pid-from-above>"
  ```
- `-v team-sober-data:/app/data` — a named Docker volume so posts, uploads,
  and accounts survive container restarts. The Dockerfile writes data to
  `/app/data`, and without a mounted volume that data is lost when the
  container is removed.

### 4. Set admin credentials

Sign-in works two ways, and both can be used side by side:

- **Site owner password** — a single password compared directly against an
  environment variable (see
  [`auth.service.ts`](../automation/src/auth/auth.service.ts)). No email or
  username, just the one shared secret.
- **Per-admin accounts** — individual email + password logins, managed at
  **Admin → Admins** (`/admin/admins`) once signed in. Stored in
  `admins.json` inside the data volume, passwords hashed (never stored in
  plain text). See
  [`admins.service.ts`](../automation/src/admins/admins.service.ts).

| Variable | Purpose | Required? |
|---|---|---|
| `ADMIN_PASSWORD` | The site owner sign-in password. Unset disables it — sign-in then only works if at least one admin account exists. | Recommended, at least until you've created an admin account |
| `AUTH_SECRET` | Signs session cookies. Must be **32+ characters**. Without it, a random one is generated on every boot, so each restart signs you out. | Recommended, for stable sessions |
| `SESSION_SECRET` | Legacy alias for `AUTH_SECRET`, still read if `AUTH_SECRET` is unset. | No — prefer `AUTH_SECRET` |

To change `ADMIN_PASSWORD` later, stop the container and recreate it with a
new `-e ADMIN_PASSWORD=...` — `docker start` reuses the container's original
environment and will not pick up a new value. Per-admin account passwords are
changed from the **Admins** page in the UI instead, not via environment
variables.

#### Forgot the admin password?

If you signed in with an **individual admin account**, another signed-in
admin can set you a new password from **Admin → Admins → [your email] → Set
a new password** — no server restart needed.

If you only ever used the **site owner password** and forgot it (or never
created any admin accounts), "resetting" it means recreating the container
with a new value:

```powershell
docker rm -f team-sober
docker run -d --name team-sober -p 3000:3000 -e ADMIN_PASSWORD="your-new-password" -e AUTH_SECRET="a-random-string-at-least-32-characters-long" -v team-sober-data:/app/data team-sober-automation
```

The `-v team-sober-data:/app/data` volume is untouched by this, so posts,
uploads, learner accounts, and any admin accounts you've created are
unaffected — only the site owner password changes. To check what password a
*running* container currently has without guessing:

```powershell
docker exec team-sober printenv ADMIN_PASSWORD
```

If you're locked out entirely (no `ADMIN_PASSWORD` and no admin account
password you remember), recreating the container with a new
`ADMIN_PASSWORD` as above always works — it doesn't touch the stored admin
accounts, and once signed in with it you can reset any admin's password from
the Admins page.

See
[DEVELOPMENT.md → Learner accounts vs the admin password](../DEVELOPMENT.md#learner-accounts-vs-the-admin-password)
for how both of these differ from learner accounts.

### 5. Sign in

Open **http://localhost:3000/login** and enter the password set in
`ADMIN_PASSWORD`.

### 6. Useful commands

```powershell
docker logs team-sober -f                          # follow logs
docker stop team-sober                              # stop the container
docker start team-sober                              # start it again (same env vars/volume)
docker rm -f team-sober                              # remove the container (volume data is kept)
docker exec team-sober printenv ADMIN_PASSWORD       # verify the active password inside the container
docker ps -a --filter name=team-sober                # check container status
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker` commands fail with a connection error | Docker Desktop engine isn't running | Open Docker Desktop and wait for `docker info` to succeed |
| Docker Desktop window never appears, but processes are running | Window closed/minimized to tray, engine still alive | Click the tray icon, or do a full restart (see Step 1) |
| `docker run` fails with "port is not available" | Something else on the host already uses that port | Find and stop it, or map to a different host port (see Step 3) |
| Container is `Exited` after a Docker Desktop restart | Restarting Docker Desktop stops running containers | `docker start team-sober` to bring it back up |
| Signed out after every restart | No `AUTH_SECRET` set, so a new random one is generated each boot | Set a fixed `AUTH_SECRET` (32+ chars) |

---

## Notes

- **Learner accounts** (`/account`) are separate from the admin password —
  visitors self-register with a name and email and are not configured via
  environment variables. See
  [DEVELOPMENT.md → Learner accounts vs the admin password](../DEVELOPMENT.md#learner-accounts-vs-the-admin-password)
  for the full model.
- For running the app directly with Node (no Docker), see
  [DEVELOPMENT.md](../DEVELOPMENT.md).
