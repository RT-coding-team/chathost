# chathost
Comprehensive Partner Support Services For The Well.  Ansible playbook for AWS EC2.

This project is related to The Well, a raspberry pi based platform for Moodle class delivery.

# Components
* Rocketchat
* MongoDB for Rocketchat and Chathost APIs
* Chathost APIs (Developer Info: https://github.com/RT-coding-team/chathost/tree/main/src)
* nginx for Rocket, Chathost APIs
* BoltCMS for content management

# Building on AWS EC2
* Quickstart Video: https://www.loom.com/share/48ad3da736d045198bc96c00d0efea3c?sharedAppSource=personal_library
* Create a new, unused EC2 instance 
* OS selection: Amazon Linux 2 AMI (HVM), SSD Volume Type (64-bit x86) 
* Select Instance Type: Suggest T3 Large at $60 per month on demand or $360 per year plus data transfer
* Step 3: Defaults
* Step 4: Set to 32 Gigabytes or more
* Step 5: Optional
* Step 6: Create a security policy allowing the following ports: 22, 80, 443, 8000
* Step 7: Confirm and Launch
* Step 8: Use existing or create new SSH keys for the server. If creating new keys, be certain to download these keys to your computer.  You cannot do this later.
* Step 9: After a few seconds, AWS will assign a public IP address, record this address for use in the Ansible instructions below

# Create AWS Certificate
* Quickstart Video: https://www.loom.com/share/82916857b7934e49a4bfea21c7262a61?sharedAppSource=personal_library
* Navigate to AWS ACM
* Click Request Certificate button
* Request a Public Certificate
* Input the Domain Name That You're Using 
* Select DNS Validation
* After clicking "Confirm & Request" select the arrow and click the button called "Create Record In Route 53"
* Wait a while.  AWS takes hours to process an ACM.  You can proceed with Load Balancer but you will need to only create the HTTP load balancer and add the HTTPS configuration later.

# Create AWS Applications Load Balancer
* Quickstart Video 1: https://www.loom.com/share/e74550e9a4c842278cd00cd95008967f
* Quickstart Video 2: https://www.loom.com/share/72949591909640a3b340ce01f43eb8d7
* Follow the videos to point the load balancer at the chathost EC2 instance created above.

# DNS
* Quickstart Video: https://www.loom.com/share/a75228bff4474a9c887cbd7eaf5f3411?sharedAppSource=personal_library
* Set hostname like moodle.yourorg.org to point to the IP of the EC2 instance
* Set hostname like chat.yourorg.org to point to the ELB address
* Set hostname like bolt.yourorg.org to point to the ELB address
* These settings may take some time to propagate on the Internet and work as planned

# Configuration via ansible
* Install Ansible and GitHub Desktop on Mac or PC
* Clone This Repo (Downloads it to your computer)
* Navigate to ~/github/chathost/ansible 
* Quickstart Video: https://www.loom.com/share/338170094a96420794cd62c15c0e6399?sharedAppSource=personal_library
* Edit inventory file to set the hostname to moodle.yourorg.org or the hostname configured above
* Run this command: `ansible-playbook -i inventory site.yml`
* This will install needed components and launch.  Takes about 15 minutes
* Verify Install: Video: https://www.loom.com/share/7dff0ba499f340ee83ecb9e92c6ec350?sharedAppSource=personal_library

# Backup
AWS Backup has a simple backup tool for EC2 instances.  Recommend the daily, monthly or daily, monthly, yearly backup plan.  Document: https://aws.amazon.com/blogs/aws/aws-backup-ec2-instances-efs-single-file-restore-and-cross-region-backup/

# Startup
* In web browser, navigate to http://chat.yourorg.org and set up Rocketchat.
  * Video: https://www.loom.com/share/2288f2598a3a4346b9d9e52b34b00eb6?sharedAppSource=personal_library
* In web browser, navigate to http://chat.yourorg.org/dashboard and set up Dashboard.
  * You must create user accounts in RocketChat (https://www.youtube.com/watch?v=4sTXuZ2q2Hg) and these users MUST have the roles of at least Leader or Admin to be allowed to connect to Dashboard.
  * Video Intro for Dashboard: https://www.loom.com/share/58b8307e643443e2b9f8c7a847b586a6?sharedAppSource=personal_library

# Usage
* Teacher Setup
  * Video: https://www.loom.com/share/37d28730fba6481180362c036980c0b7?sharedAppSource=personal_library
  * A teacher account, with a valid email address should be set up in Rocketchat first.  The teacher must have a role of "User" or "Admin" if you wish for that teacher to be an Admin.
  * The Well instance must be configured to sync to the same server with Rocketchat.  When the Well is connected to the Internet, it will sync every ten minutes or may be manually sync'd at http://learn.thewell/local/chat_attachments/push_messages.php?logging=display (more documentation on this sync: https://github.com/RT-coding-team/the-well-moodle310/tree/master/local/chat_attachments).
  * Sync status can be confirmed in the Dashboard at http://yourrocketchatserver/dashboard
  * Create a course in the Well's Moodle instance and create the teacher account.  The teacher will never access the account here.
* Adding a Student
  * Video: https://www.loom.com/share/70ad80239e6a4b22862b88b54fe77b8c?sharedAppSource=personal_library
  * Add a student account to the course.  After the student has been added and the box syncs (see above), the teacher's Rocketchat account will receive an automated notification chat of the student connection.  The teacher may then reply and a chat will be sent to the student at the next sync.

# Additional Resources
https://docs.rocket.chat/installation/paas-deployments/aws
