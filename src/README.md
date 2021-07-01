# Chathost Dashboard and API server for Chat communications between the Well and Rocketchat

This nodejs application provides a web dashboard for viewing the boxes that are managed and sync'd at this server.  It also provides the APIs that the Moodle plugin chat_attachments (https://github.com/RT-coding-team/the-well-moodle310/tree/master/local/chat_attachments) employs to sync messages between custom Well Moodle app for Android (https://github.com/RT-coding-team/moodleapp) and Rocketchat which will be located on this same server.

# Initialization
* Uses node 10.15+
* cd ~ and run npm install to install all the libararies
* cd src and run node index.js to run the application.  By default http://localhost:2820/dashboard will access the code.
* Uses Rocketchat authorization (admins and leaders) so configure the settings in configs.js to access your rocketchat server
* For production installation see the Readme at the root level of this repo.

# Testing
* API specifications and tests are available in the Postman collection found in the src directory with Postman (https://www.postman.com)
* Run the full collection script to test all APIs
