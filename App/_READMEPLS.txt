WebChat: a live videoconference app, akin to Google Hangouts. Uses WebRTC APIs for functionality.
Purpose: create a modified Google Hangouts, which allows one to silence oneself to other users (if user 1 silences themselves to user 2, then user 3 can still hear
		user 1, but user 2 cannot)
Creators: Sergey Gruzdev (sergeygruzdev98@gmail.com) and Boston Messbarger (bostger@gmail.com)
	  ^ JavaScript and functionality		 ^ HTML, CSS, animation, and appearance
Specs:	- Support for "chat rooms"
	- Support for multiple users in each chatroom
	- Simple UI
	- Users can create chatrooms
	- Authentication (if the creator wants it)
	- Users in chatroom can silence themselves to other users in their room
	- Users can leave room when they wish
	- Dynamic video layout and sizing - support for different-sized screens

TODO:	- Support for "chat rooms"
	- Authentication
	- Everything having to do with chatrooms
	- Dynamic sizing and support for different screens

Admin stuff: 	- Get permission from CPS to install WebChat (so they don't shut down the network when the traffic shifts)
		- Add server (big grey old computer) to network, finish configuring Win10
		- Install WebChat on server
		- Install security certificate on server, to use "https"
		- Make sure "node server.js" is run on startup
		- Maybe get a domain name to ease access to the service

Installation:	1) Install Git (https://git-scm.com/downloads)
		2) Install NodeJS and NPM (https://nodejs.org/en/)
		3) Clone WebChat directory: https://github.com/LolingLenin/WebChat.git (contact me if it doesn't allow you)
		4) Open cmd, cd into WebChat/App
		5) In cmd, type "npm install package.json"
		6) Configure datServer.bat to run on startup - this will ensure that the service will run if the computer shuts down and is restarted
		7) Reboot
		8) (Optional) run "node server.js" in cmd to run the server manually

Acceesing/Usage: 1) Make sure server.js is running
		 2) If on local machine, navigate to "https://localhost:1755/client"
		 3) If on remote machine, navigate to the IP of the server: "https://###.###.###.###:1755/client"
		 4) Type "caccculinary" when prompted for password (temporary security)
		 5) Done - wait for other clients

Files:
	-favicon.ico: the image that appears on your browser tab
	-datServer.bat: runs "node server.js"
	-css.css: all css stuff for appearance
	-test.html: for testing WebRTC components, mainly getUserMedia
	-index.html: client-side functionality
			- Captures user media and sends to other clients
			- Displays local and received media
			- Communicates with server to establish connections
				- Order of operations for connections is somewhat dynamic, see WebRTC websites and forums for generic breakdown
				- Operations run "assynchrously" - one function does not necessarily wait for its pre-requisite to finish
			- Displays and enables functionality of buttons
			- Runs client-side authentication (inputting password, etc., server.js handles the actual authentication)
			- This is where all client-side stuff goes
	-server.js: server-side functionality
			- Enables communication between clients
			- Receives and redirects messages
			- Handles logging
			- Handles authentication (all authentication data received from index.html)
			- This is where all room functionality and organization will go

Considertations:
	- Client machine is responsible for all video functions: sending, receiving, interpreting, and displaying. This limits the possible number of users based on 
		machine strength.
	- If multiple users attempt to log in at once, some strange problems may arise (this may have to do with WebRTC internals, the issue is very hard to reproduce)
	- Occasionally problems arise if trying to connect multiple clients on same machine (if you open 4 browser tabs and navigate each to the service for example),
		we don't know if that is due to lag or if there are internal problems.
	- If WebRTC releases support for centralized (server-side) handling of video for multiple clients, implement it and put on stronger server - better for clients
	- Since dynamic sizing is not supported yet, when you startup WebChat odds are you won't see any video. Don't panic - just scroll down.