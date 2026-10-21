# Checklists

## Deployment checklist (do in order)
- [ ] AWS account has a billing alarm and a non-root IAM user
- [ ] VPC created: 2 public + 2 private app + 2 private DB subnets, Internet Gateway, route tables
- [ ] Security groups: sg-alb (80/443 from internet), sg-app (4000 from sg-alb only), sg-db (3306 from sg-app only)
- [ ] RDS MySQL 8 in the private DB subnets, Public access = No, backups on
- [ ] SSM parameters under /pennypal/prod: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD (SecureString), DB_NAME, JWT_SECRET (SecureString), CLIENT_ORIGIN
- [ ] IAM role for EC2 with infrastructure/iam-ec2-policy.json + CloudWatchAgentServerPolicy + AmazonSSMManagedInstanceCore
- [ ] EC2 launched with the role and user-data.sh; `systemctl status pennypal` is active
- [ ] Migrations and seed run once (README section 12)
- [ ] `curl http://<instance>:4000/api/ready` returns ready
- [ ] S3 bucket (private) + CloudFront with OAC; build uploaded; /api/* behavior points to the API origin
- [ ] HTTPS certificate (ACM, us-east-1) attached to CloudFront
- [ ] CloudWatch agent running, log group visible
- [ ] Alarms created and SNS email subscription confirmed
- [ ] (Optional) ALB + Auto Scaling Group created; target group health check path /api/health
- [ ] Demo and admin passwords changed before sharing the URL

## Demonstration checklist (about 10 minutes)
1. Show the architecture diagram (README) and the AWS console: VPC, subnets, security groups
2. Show RDS has no public endpoint; show sg-db allows only sg-app
3. Open the CloudFront URL over HTTPS; click Explore Demo
4. Deposit, then withdraw more than the balance (friendly failure); refresh to show persistence
5. Create a savings goal, fund it, complete it (confetti)
6. Take a quiz; show XP and a badge
7. Log in as admin; show stats and that a student gets a 403 on /api/admin/stats
8. Show SSM Parameter Store (no secrets in code) and the EC2 IAM role
9. Show CloudWatch logs and an alarm; trigger CPU alarm or stop the app to show SNS email
10. (If built) Terminate an instance and show the Auto Scaling Group replacing it
