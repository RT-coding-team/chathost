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

# Create AWS Classic Load Balancer
* Quickstart Video: https://www.loom.com/share/7ddf3eaa1e5a4ec098eca459bb8ea724?sharedAppSource=personal_library
* Select the Previous Generation Classic Load Balancer
* Give the Elastic Load Balancer (ELB) a name
* Create ELB inside VPC and select all subnets
* Set the Instance port to 8000
* (Optionally may configure an SSL certificate to enable SSL)
* Assign same security group used on EC2 creation
* Step 4: Set Ping Path to /chathost/healthcheck
* Step 5: Select instance created above
* Step 7: Review and Create

# DNS
* Quickstart Video: https://www.loom.com/share/a75228bff4474a9c887cbd7eaf5f3411?sharedAppSource=personal_library
* Set hostname like moodle.yourorg.org to point to the IP of the EC2 instance
* Set hostname like chat.yourorg.org to point to the ELB address
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

# Startup
* In web browser, navigate to http://moodle.yourorg.org and set up Moodle.
  * Video: https://www.loom.com/share/73283a126bef4c8cb02a90ddc9751d8b?sharedAppSource=personal_library
* In web browser, navigate to http://chat.yourorg.org and set up Rocketchat.
  * Video: https://www.loom.com/share/2288f2598a3a4346b9d9e52b34b00eb6?sharedAppSource=personal_library
* In web browser, navigate to http://chat.yourorg.org/dashboard and set up Dashboard.

# Additional Resources
https://docs.rocket.chat/installation/paas-deployments/aws
