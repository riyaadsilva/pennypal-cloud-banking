#!/bin/bash
# EC2 launch template user data (Amazon Linux 2023). Replace REPO_URL, or bake an AMI after the first run.
set -euo pipefail
dnf install -y nodejs20 git amazon-cloudwatch-agent
useradd --system --home /opt/pennypal pennypal || true
git clone REPO_URL /opt/pennypal || (cd /opt/pennypal && git pull)
cd /opt/pennypal/server && npm ci --omit=dev
chown -R pennypal:pennypal /opt/pennypal
cp /opt/pennypal/infrastructure/pennypal.service /etc/systemd/system/
cp /opt/pennypal/infrastructure/cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
systemctl daemon-reload && systemctl enable --now pennypal
# Run migrations once (first instance only): cd /opt/pennypal/server && sudo -u pennypal SSM_PREFIX=/pennypal/prod node -e "..." or use .env
