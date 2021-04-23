# chathost
Comprehensive Partner Support Services For The Well.  Ansible playbook for AWS EC2

# Compoents
* Moodle (Course Authoring)
* MariaDB for Moodle
* nginx for Moodle
* Rocketchat
* MongoDB for Rocketchat and Chathost APIs
* Chathost APIs (nodejs)
* nginx for Rocket, Chathost APIs
* TBD: resourcespace (will use nginx and mariadb)

# Building on AWS EC2
* Create a new, unused EC2 instance (Suggest T3 Large at $60 per month on demand or $360 per year plus data transfer)
* OS selection: Amazon Linux 2 AMI (HVM), SSD Volume Type - ami-0518bb0e75d3619ca (64-bit x86) 
* Step 3: Defaults
* Step 4: Set to 32 Gigabytes or more
* Step 5: Optional
* Step 6: Create a security policy allowing the following ports: 22, 80, 443, 8000
* Step 7: Confirm and Launch

# Create AWS Classic Load Balancer
* Select the Previous Generation Classic Load Balancer
* Give the Elastic Load Balancer (ELB) a name
* Create ELB inside VPC and select all subnets
* Set the Instance port to 8000
* (Optionally may configure an SSL certificate to enable SSL)
* Assign same security group used on EC2 creation
* Step 4: Set Ping Path to /chathost/healthcheck
* Step 5: Select instance created above.
* Step 7: Review and Create

# DNS
* Set hostname like http://moodle.yourorg.org to point to the IP of the EC2 instance
* Set hostname like http://chat.yourorg.org to point to the ELB address

# Configuration via ansible
* Install Ansible on PC
* Clone This Repo
* Navigate to ~/chathost/ansible
* Edit inventory file to set the IP/hostname
* Run this command: `ansible-playbook -i inventory site.yml`
* This will install needed components and launch.  Takes about 15 minutes.  

# Additional Resources
https://docs.rocket.chat/installation/paas-deployments/aws
