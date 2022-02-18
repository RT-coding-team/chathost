# Chathost Dashboard and API server for Chat communications between the Well and Rocketchat

This nodejs application provides a web dashboard for viewing the boxes that are managed and sync'd at this server.  It also provides the APIs that the [TheWll Moodle plugin chat_attachments](https://github.com/RT-coding-team/the-well-moodle310/tree/master/local/chat_attachments) employs to sync messages between custom Well Moodle app for Android (https://github.com/RT-coding-team/moodleapp) and Rocketchat which will be located on this same server.

# How It Works
There are two programs that sync with Chathost:
- For Moodle, [TheWell Moodle plugin chat_attachments](https://github.com/RT-coding-team/the-well-moodle310/tree/master/local/chat_attachments)
- For Installations Without Moodle, [phonehome.py](https://github.com/ConnectBox/connectbox-pi/blob/master/scripts/phonehome.py)

View the [chat_attachments](https://github.com/RT-coding-team/the-well-moodle310/tree/master/local/chat_attachments) readme to see details on the flow of sync data between the devices.  Phonehome.py is a simpler version of the Moodle sync that does not sync messages.

The API from TheWell to Chathost uses Bearer token authorization.  New devices auto-select a GUID as their token and Chathost accepts new boxes automatically for easy onboarding of new remote locations.

# Development
* Uses node 10.15+
* cd ~ and run npm install to install all the libararies
* cd src and run node index.js to run the application.  By default http://localhost:2820/dashboard will access the code.
* Uses Rocketchat authorization (admins and leaders) so configure the settings in configs.js to access your rocketchat server
* For production installation see the Readme at the root level of this repo.

# Testing
* API specifications and tests are available in the Postman collection found in the src directory with Postman (https://www.postman.com)
* Run the full collection script to test all APIs
