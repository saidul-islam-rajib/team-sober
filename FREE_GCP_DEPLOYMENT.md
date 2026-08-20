# Free GCP Deployment for Team Sober

This guide explains how to run the `team-sober` app completely free on Google Cloud Platform using the Always Free tier.

> This assumes you want a single VM deployment with Docker and Jenkins on the same instance.

## 1. Create your GCP account

1. Open https://cloud.google.com/.
2. Click `Get started for free`.
3. Sign in with your Google account or create one.
4. Enter billing details when prompted.
5. Claim the one-time `$300` credit.
6. Accept the terms and complete registration.
7. In the GCP Console, open the Navigation menu and select `APIs & Services` > `Library`.
8. Search for `Compute Engine API` and click `Enable`.

## 2. Choose a free-tier region

1. In the GCP Console, go to Compute Engine > VM instances.
2. Click `Create instance` and review the region selector.
3. Choose one of the Always Free eligible regions:
   - `us-west1`
   - `us-central1`
   - `us-east1`
4. Confirm the selected region supports the `f1-micro` machine type.
5. If you see `f1-micro` as an option under machine type, this region is suitable.
6. If not, switch to another region until `f1-micro` appears.

## 3. Create one VM instance

1. In Compute Engine > VM instances, click `Create instance`.
2. Give the VM a name: `team-sober-free`.
3. Set the region to the free eligible region you chose.
4. Choose a zone in the same region.
5. Under `Machine configuration`, select:
   - Series: `E2` (or recommended for free tier)
   - Machine type: `f1-micro`
6. Under `Boot disk`, click `Change` and choose:
   - OS: `Ubuntu` or `Debian`
   - Version: latest LTS
   - Boot disk type: `Standard persistent disk`
   - Size: `10 GB` (or `30 GB` max free)
7. Under `Firewall`, check both:
   - `Allow HTTP traffic`
   - `Allow HTTPS traffic`
8. Optionally, enable `Allow HTTP traffic` and `Allow HTTPS traffic`.
9. Click `Create`.

## 4. Install Docker and Git on the VM

1. In the VM list, click the `SSH` button next to `team-sober-free`.
2. Wait for the SSH window to open.
3. Run these commands:

```bash
sudo apt update
sudo apt install -y docker.io git
```

4. Add your user to the Docker group:

```bash
sudo usermod -aG docker $USER
```

5. Refresh the shell group membership:

```bash
newgrp docker
```

6. Verify Docker works:

```bash
docker run --rm hello-world
```

## 5. Clone your project repository

1. Find your repository URL on GitHub.
2. In the SSH terminal, create a workspace directory:

```bash
sudo mkdir -p /opt
sudo chown $USER:$USER /opt
cd /opt
```

3. Clone the repo:

```bash
git clone https://github.com/<your-username>/<your-repo>.git team-sober
```

4. Enter the automation folder:

```bash
cd team-sober/automation
```

5. If the repo is private, use one of these options:
   - SSH clone with a configured SSH key
   - clone locally and copy files to the VM
   - use a personal access token in the URL carefully

## 6. Build the Docker image

1. Ensure you are in `/opt/team-sober/automation`.
2. Run the build command:

```bash
docker build -t team-sober .
```

3. Wait until the image build completes.
4. Confirm the image exists:

```bash
docker images | grep team-sober
```

## 7. Create persistent storage for app data

1. Create a directory for app data on the VM:

```bash
mkdir -p /opt/team-sober-data
```

2. Ensure the directory owner is your user:

```bash
sudo chown $USER:$USER /opt/team-sober-data
```

3. Keep the data usage under 30 GB to stay within the Always Free disk limit.

## 8. Run the app container

1. From `/opt/team-sober/automation`, run:

```bash
docker run -d --name team-sober \
  --restart unless-stopped \
  -p 3000:3000 \
  -e ADMIN_PASSWORD="choose-a-password" \
  -e AUTH_SECRET="a-random-string-at-least-32-characters-long" \
  -v /opt/team-sober-data:/app/data \
  team-sober
```

`--restart unless-stopped` is what makes the container come back on its own
after a VM reboot or crash — without it, an outage means SSHing back in and
running this command by hand. `ADMIN_PASSWORD` is not optional: without it
the admin area cannot be signed into at all.

2. Check the container status:

```bash
docker ps | grep team-sober
```

3. If the container is not running, inspect logs:

```bash
docker logs team-sober
```

4. Find the VM external IP in the GCP Console.
5. Open the app in your browser:

```text
http://<VM_EXTERNAL_IP>:3000
```

## 9. Install Jenkins in Docker

1. Create a Jenkins data directory:

```bash
mkdir -p /opt/jenkins_home
sudo chown $USER:$USER /opt/jenkins_home
```

2. Run Jenkins:

```bash
docker run -d --name jenkins \
  --restart unless-stopped \
  -p 8080:8080 -p 50000:50000 \
  -v /opt/jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts
```

3. Confirm Jenkins is running:

```bash
docker ps | grep jenkins
```

4. Open Jenkins in your browser:

```text
http://<VM_EXTERNAL_IP>:8080
```

5. Complete the setup wizard:
   - Get the initial admin password:

```bash
sudo cat /opt/jenkins_home/secrets/initialAdminPassword
```

   - Install recommended plugins.
   - Create the first admin user.

## 10. Create a Jenkins pipeline job

1. In Jenkins, click `New Item`.
2. Enter a job name such as `team-sober-deploy`.
3. Choose `Pipeline` and click `OK`.
4. In the job configuration, under `Pipeline`, select `Pipeline script`.
5. Paste this script:

```groovy
pipeline {
  agent any
  stages {
    stage('Checkout') {
      steps {
        git 'https://github.com/<your-username>/<your-repo>.git'
      }
    }
    stage('Build') {
      steps {
        dir('automation') {
          sh 'docker build -t team-sober .'
        }
      }
    }
    stage('Deploy') {
      steps {
        sh '''
          docker rm -f team-sober || true
          docker run -d --name team-sober --restart unless-stopped \
            -p 3000:3000 -v /opt/team-sober-data:/app/data \
            -e ADMIN_PASSWORD="choose-a-password" \
            -e AUTH_SECRET="a-random-string-at-least-32-characters-long" \
            team-sober
        '''
      }
    }
  }
}
```

6. Save the job.
7. Run the job once to verify it checks out, builds, and deploys.
8. If the repo is private, configure credentials:
   - Add credentials in Jenkins credentials store.
   - Use the `git` step with `credentialsId`.

## 11. Keep usage inside Always Free limits

1. Use only one VM in GCP.
2. Keep the boot disk at 30 GB or smaller.
3. Do not add extra VMs, Cloud SQL instances, or paid networking services.
4. Avoid large outbound traffic.
5. Monitor your usage in the Billing > Reports section.

## 12. Optional: secure the app

1. If you want HTTPS later, use a domain name and a reverse proxy.
2. For the free demo, keep the app running on port `3000`.
3. Do not add additional paid services just for HTTPS if you want to remain free.

## 13. Recommended cleanup commands

If you need to restart or remove containers:

```bash
docker rm -f team-sober || true
docker rm -f jenkins || true
```

## 14. Health monitoring and restarting

A free-tier VM has no other monitoring in front of it, so it's worth setting
up both layers below — they cover different failure modes.

### Outside the app: does the host still answer at all?

`scripts/healthcheck.sh` polls `/health` and can alert to a Slack-compatible
webhook. This is the only thing that still works when the app itself is
unreachable — an in-app page cannot report on its own outage.

```bash
sh scripts/healthcheck.sh
```

```bash
sudo crontab -e
```

```cron
# Check the site every 5 minutes.
*/5 * * * * ALERT_WEBHOOK=https://hooks.slack.com/services/… HEALTH_URL=http://127.0.0.1:3000/health /usr/bin/sh /opt/team-sober/scripts/healthcheck.sh >> /var/log/team-sober-healthcheck.log 2>&1
```

### Inside the app: **Admin → System**

Signed in as admin, `/admin/system` shows uptime, memory, how large the data
directory has grown, whether `ADMIN_PASSWORD` / `AUTH_SECRET` / mail are
actually configured (the easiest things to forget on a fresh VM), and current
login lockouts — with a one-click **Clear all lockouts** if the in-memory
rate limiter needs resetting without a full restart.

It also has a **Restart app** button. It only ever comes back on its own if
`--restart unless-stopped` was used when the container was started (see
section 8) — without that, restarting from this page takes the site down
until someone runs `docker start team-sober` by hand.

## Notes

- This guide targets the GCP Always Free tier.
- Jenkins can run on the same small VM, but performance will be limited.
- If the free `f1-micro` is unavailable in your chosen region, you may need to switch regions or pay for a larger VM.
