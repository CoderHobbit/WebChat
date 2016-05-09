var express = require('express')(); // Node module for doing server things
var app = require('http').Server(express); // HTTP module for doing server things for socket io
var io = require('socket.io')(app); // Websocket module for communicating

// Total population - for assigning ids
var population = 0;
// All the sockets
var sockets = [];
// All rooms; each room has a name, password, population, and set of users
var rooms = [];

/*
* parseJSON: parses thing into JSON (if it is parseable), or returns it
* Precondition: thing is not null; it'd be helpful if it was stringified JSON
* Postcondition: thing is unchanged
* Parameter: thing - the variable you want to try parsing
* Return value: either thing (if it isn't parseable), or JSON object representing thing
*/
function parseJSON(thing)
{
 	var result = false;
	try
	{
		result = JSON.parse(thing);
	}
	catch(e)
	{
		result = thing;
	}

	return result;
}

/*
* findUser: finds particular user based on their socket
* Precondition: socket is a valid socket object (beware - no variable types in javascript!)
* Postcondition: socket is unchanged
* Parameter: socket - a valid socket object representing the websocket whose owner you're looking for
* Return value: Either the user owning socket, or false if no user found
*/
function findUser(socket)
{
	// Search through all the rooms
	for(var i = 0; i < rooms.length; i ++)
	{		
		
		var rm = rooms[i];
		// Look at all the users
		for(var j = 0; j < rm.getUsers().length; j ++)
		{
			// There they are?
			if(rm.getUsers()[j].getSocket() === socket)
			{
				return rm.getUsers()[j]; // There they are!
			}
		}
		// Look through the connection queue
		for(var j = 0; j <rm.connectionQueue.length; j++)
		{
			if(rm.connectionQueue[j].getSocket() === socket)
			{
				return rm.connectionQueue[j]; // There they are!
			}
		}
		
	}

	console.log("404: User not found!");
	// Didn't find anything :/
	return false;
}

/*
* findUserById: just like findUser, but uses user ID instead of websocket
* Precondition: id is a valid integer value between 0 and population
* Postcondition: id is unchanged
* Parameter: id - the ID you are looking for
* Return value: the user corresponding with the ID, or false if user wasn't found
*/
function findUserById(id)
{
	// Search through all the rooms
	for(var i = 0; i < rooms.length; i ++)
	{
		var rm = rooms[i];
		// Search through users
		for(var j = 0; j < rm.getUsers().length; j++)
		{
			if(rm.getUsers()[j].getId() === id)
			{
				return rm.getUsers()[j]; // Found!
			}
		}
		// Search through connection queue
		for(var j = 0; j <rm.connectionQueue.length; j++)
		{
			if(rm.connectionQueue[j].getId() === id)
			{
				return rm.connectionQueue[j]; // Found!
			}
		}
	}

	console.log("Error 404: User not found!");
	return false;
}

/*
 * Object Prototype User: an object prototype representing a user.
 * Usage: var usr = new User("blah", blahSocket, blahRoom);
 * Precondition: 
 *				screenName is a valid string passed by user
 *				room is a valid Room
 *				socket is a valid websocket
 * Postcondition: created a new User (DOES NOT add to room - idk why, design choices - do that manually)
 * Parameters: 
 *				screenName - user's desired name 
 *				socket - user's websocket
 *				room - room user will be in
 * Return value: a User object
 * 
 * Attributes:
 *				this.screenName - screen name corresponding to the User
 *				this.socket - websocket corresponding to the User
 *				this.room - room containing this User
 *				this.id - User's ID, assigned automatically
 */
function User(screenName, socket, room)
{
	// Attributes of user: name, socket, room, id
	this.screenName = screenName;
	this.socket = socket;
	this.room = room;
	// Automatically assign ID
	this.id = population;

	// Increment population
	population ++;
	
	// Behaviors: setters for the attributes
	// I purposefully didn't include an ID setter - don't mess with it!
	this.setName = function(newName) {this.screenName = newName;};
	this.setSocket = function(newSocket) {this.socket = newSocket;};
	this.setRoom = function(newRoom) {this.room = room;};
	// Behaviors: getters for attributes
	this.getName = function() {return this.screenName;};
	this.getSocket = function() {return this.socket;};
	this.getRoom = function() {return this.room;};
	this.getId = function() {return this.id;};
	// Getters and setters note: you don't actually have to use them, but for OOP purposes... there they're

	// Websocket event listeners
	/*
	 * Callback on message: activates every time this socket receives a message (from end user)
	 * Precondition: none
	 *	Postcondition: socket responds to messages
	 * Parameters: m - message sent to socket
	 * Return value: none
	 */
	this.socket.on('message', 
						function(m)
						{	
							// Find my user
							var usr = findUser(this);
							// Add the return address to the message
							m.from = usr.getId();
							// Parse message
							var info = parseJSON(m);
							// Log
							console.log(usr.screenName + ' sent message to ', info.to);
							// Shoot message through room handler
							usr.getRoom().sendToId(info.to, m);
						});

	/*
	 * Callback on disconnect: activates when this socket loses its connection
	 * Precondition: end user has disconnected
    * Postcondition: user has been removed from everything. If user was last in their room, the room has been shredded
    * Parameters: none
	 * Return value: none
	 */
	this.socket.on('disconnect',
						function()
						{
							// Find myself
							var usr = findUser(this);
							// Log
							console.log(usr.screenName + ' has left us!');
							// Remove me from my room
							usr.room.removeUser(usr);
							// Shred my room
							if(usr.getRoom().getPopulation() <= 0)
							{
								// Delete empty room
								roomShredder(usr.room);
							}
						});
	/*
	 * Callback for "imin": activates when the "imin" event is fired. Initially disabled; set when user is added to room
    * Precondition: user has been added to a valid room
	 * Postcondition: user has been added to connection frenzy. Now user can communicate with the others
	 * Parameters: none
    * Return value: none
	 */
	this.socket.on('imin', // User fires this "i'm in (the room)" event whenever they are ready to enter the connection frenzy
						function() // This one is initially disabled; enabled when this is added to a room
						{
							// Disabled
						});
}

/*
 * Object Prototype Room: an object prototype representing a chatroom
 * Precondition: no other Room called roomName exists; roomName and password are valid strings
 * Postcondition: a new Room with name roomName and password password
 * Parameters:
 *				roomName - desired name of room supplied by user
 * 			password - desired room password supplied by user
 * Return value: new Room object
 *
 * Attributes:
 *				this.roomName - name of chatroom (must be unique)
 * 			this.password - password to access chatroom
 * 			this.population - total count of all users
 *				this.users - array of Users in chatroom
 *				this.orderOfConnections - users waiting to connect to each other
 * 			this.receiver - current user receiving all connection requests
 *				this.orderIsRunning - flag for whether or not connection frenzy is happening
 *				this.connectionQueue - if frenzy is happening, users are deposited here, to await next connection round
 */
function Room(roomName, password)
{
	// Properties of room: name, password, population, set of users
	this.roomName = roomName;
	this.password = password;
	this.population = 0;
	this.users = [];

	// Functional stuff - used in connecting
	// Order in which existing clients connect to a new one
	this.orderOfConnections = [];
	// Incoming client
	this.receiver = null;
	// State variable - for extra safety
	this.orderIsRunning = false;
	// Anyone who drops by while we are establishing connections will sit here
	this.connectionQueue = [];
	
	// Behaviors: setters
	this.setName = function(newName) {this.roomName = newName;};
	this.setPassword = function(newPassword) {this.password = newPassword;};
	// Behaviors: getters
	this.getName = function() {return this.roomName;};
	this.getPassword = function() {return this.password;};
	this.getUsers = function() {return this.users;};
	this.getPopulation = function() {return this.population;};
	
	/*
	 * addUser: adds newUser to this Room's list of users and sets the 'imin' callback
	 * Precondition: newUser is a valid User object and is not already in this Room
	 * Postcondition: newUser is added to this Room's list of users, server can respond to 'imin' event from User
    * Parameter: newUser - a valid User to be added to the room
	 * Return value: none
	 */
	this.addUser = function(newUser)
						{
							// Register user
							this.connectionQueue.push(newUser);
							// Increment population
							this.population += 1;
							console.log("Added " + newUser.getName() + " at index " + this.population - 1);
							// Enabled 'imin' callback
							newUser.socket.on('imin',
													function()
													{
														// Find myself
														var usr = findUser(this);
														console.log("Found: " + usr.getName());
														// Run order if it isn't already running
														if(!usr.room.orderIsRunning)
															usr.room.runOrder();
													});
						};
   /*
	 * removeUser: removes ripUser from this Room
    * Precondition: ripUser is a valid User object
    * Postcondition: ripUser is no longer referenced in this Room
    * Parameter: ripUser - User to be removed from this Room
    * Return value: none
    */
	this.removeUser = function(ripUser)
							{
								// Find
								for(var i = 0; i < this.users.length; i ++)
								{
									if(this.users[i].getId() == ripUser.getId())
									{
										// Remove									
										this.users.splice(i, 1);
									}
								}
								// Clean other arrays
								for(var i = 0; i < this.connectionQueue.length; i ++)
								{
									if(this.connectionQueue[i].getId() == ripUser.getId())
									{
										// Remove									
										this.connectionQueue.splice(i, 1);
									}
								}
								for(var i = 0; i < this.orderOfConnections.length; i ++)
								{
									if(this.orderOfConnections[i].getId() == ripUser.getId())
									{
										// Remove								
										this.orderOfConnections.splice(i, 1);
									}
								}
								// Decrement population
								this.population -= 1;
							};

	/*
	 * Messengers: functions for sending messages to various users
  	 * Precondition: messages and data (probly stringified JSON) are valid strings, user IDs are valid numbers, Users are valid User objects
	 * Postcondition: msg and data have been sent to the destination (see specific behaviors for specific postconditions)
    * Parameters:
	 *					msg - message/event to be sent
    *					data - stringified JSON, whatever additional data needed
    *					user - recipient of message and data
    *					id - User ID by which the recipient can be found
	 * Return values: none
    * Note: difference between socket.emit and socket.send:
	 *				socket.emit requires both a msg (event) and data (actual message), and is caught by socket.on(msg/event) listeners
    *				socket.send requires only data/msg, and is equivalent to 'socket.emit("message", data/msg)'
    */

	// Postcondition: msg and data have been sent to all the users in this room
	this.broadcast = function(msg, data)
							{
								// Cycle through all users, send msg to each socket
								for(var i = 0; i < this.users.length; i ++)
								{
										this.users[i].getSocket().emit(msg, data);
								}
							};
	// Postcondition: data has been sent to specified valid User
	this.sendToUser = function(user, data)
							{
								console.log(this.roomName + ': Sending message to ' + user.getName());
								// Send data
								user.getSocket().send(data);
							};

	// Postcondition: msg and data has been sent to specified valid User
	this.emitToUser = function(user, msg, data)
							{
								// Find the user
								console.log(this.roomName + ': Emitting message to ' + user.getName());
								// Send message
								user.getSocket().emit(msg, data);
							};
	// Postcondition: data has een sent to User with specified ID
	this.sendToId = function(id, data)
							{
								
								// Find the user
								var recip = findUserById(id);
								console.log(this.roomName + ': Sending message to ' + recip.getName());
								// Send message
								recip.getSocket().send(data);

							};

	// Postcondition: msg and data has been sent to User with specified ID
	this.emitToId = function(id, msg, data)
							{
								// Find the user
								var recip = findUserById(id);
								console.log(this.roomName + ': Sending message to ' + recip.getName());
								// Send message
								recip.getSocket().emit(msg, data);
							};

	/*
	 * runOrder: users in connectionQueue take turns connecting to each other and users in the room
    * Precondition: orderIsRunning is false, there is at least 1 user in this room
    * Postcondition: orderIsRunning is true, connection frenzy is going on
    * Parameter: none
    * Return value: none
    */
	this.runOrder = function()
	{
		// Debug message
		console.log("Populations: " + this.users.length + " + " + this.connectionQueue.length);
		// Make sure we have at least 1 user
		if(this.users.length >= 1)
		{
			console.log('Starting order of connections!');
			// Set state
			this.orderIsRunning = true;
			// Just to be sure, clean up order of connections
			this.orderOfConnections.length = 0;
			// Dump current users into order, skip the ones in connectionQueue
			this.orderOfConnections = this.users.slice(0, this.users.length);
			console.log('Dumped users into order: ' + this.orderOfConnections.length);
			// Begin
			var caller = this.orderOfConnections[0]; // Each user in orderOfConnections takes a turn being the caller
			this.receiver = this.connectionQueue[0]; // Each user in connectionQueue takes a turn being the receiver
			// Debug messages
			console.log('Got caller: ' + caller.getName() + ' : ' + caller.getId());
			console.log('Got receiver: ' + this.receiver.getName() + ' : ' + this.receiver.getId());
			console.log('Started!');
			// The users themselves will handle connecting, WebRTC style
         // Inform caller and receiver to assume their assigned roles in the connection
			caller.getSocket().emit('start', JSON.stringify({you: 'caller', callto: this.receiver.getId()}));
			this.receiver.getSocket().emit('start', JSON.stringify({you: 'receiver', callto: caller.getId()}));
			// Once the caller and receiver are done connecting, we continue cycling
			caller.getSocket().on('doneConnecting', this.orderDone);
			this.receiver.getSocket().on('doneConnecting',
													function()
													{ 
														// Debug message
														console.log('Someone is done!');
													});
		}
		// No users in the room - transfer one from the connectionQueue and rerun this function
		else if(this.connectionQueue.length > 1)
		{
			console.log("Transferring single user from queue into users");
			// Clip queue
			this.users.push(this.connectionQueue[0]);
			this.connectionQueue.splice(0,1);
			// Rerun this function
			this.runOrder();
		}
		// 1 or less users in connectionQueue, so transfer them to the room
		else
		{
			
			// Dump whole queue into users
			this.users = this.connectionQueue.splice(0, this.connectionQueue.length);
			console.log("Pushed whole queue into users: " + this.users.length);
			return;
		}
	};

	/*
	 * orderDone: fires whenever a caller finished connecting,
	 *				  sets caller to next person in orderOfConnections,
	 *				  OR, if we've reached the last caller, set receiver to next person in connectionQueue
	 * 					and rerun the order,
	 *				  OR, if we've cycled through the entire queue, we're done
	 * Precondition: orderIsRunning is true, runOrder has been called at least once
    * Postconditions: 
	 *						orderIsRunning if false
    *						all Users in this room are connected to each other (mesh topology)
	 * 					orderOfConnections is empty, connectionQueue may not be (in case someone dropped by near the end of the frenzy)
	 * Parameter: id - id of the caller that has just finished
    * Return value: none
    */
	this.orderDone = function(id)
	{
		// Find user and room
		var doneUser = findUserById(id);
		var room = doneUser.getRoom();
		console.log('Done connecting: ', doneUser.getName());
		// Clip orderOfConnections
		room.orderOfConnections.splice(0,1);
		console.log(room.orderOfConnections.length + " users to go!");
		// Last caller?
		if(room.orderOfConnections.length == 0)
		{
			// Push new user
			console.log("Registered connected user: " + room.connectionQueue[0].getName());
			room.getUsers().push(room.connectionQueue[0]);
			// Clip connection queue
			room.connectionQueue.splice(0,1);
			// Any more receivers?
			if(room.connectionQueue.length != 0)
			{
				// Restart connection process
				room.runOrder();
			}
			else
			{
				// We're done!
				console.log('All done! ' + room.getUsers().length);
				room.orderIsRunning = false;
				return;
			}
		}
		
		// Still have callers left - trudge on
		// Set caller
		var caller = room.orderOfConnections[0];
		// Messages
		console.log('Got caller: ' + caller.getName() + ' : ' + caller.getId());
		console.log('Got receiver: ' + room.receiver.getName() + ' : ' + room.receiver.getId());
		// Alert caller and receiver to assume their roles
		caller.getSocket().emit('start', {you: 'caller', callto: doneUser.getRoom().receiver.getId()});
		room.receiver.getSocket().emit('start', {you: 'receiver', callto: caller.getId()});
		// Continue
		caller.getSocket().on('doneConnecting', room.orderDone);
		room.receiver.getSocket().on('doneConnecting', function(){console.log("Someone is done!");});
	};

	// Room is created and all behaviors set - register Room
	rooms.push(this);
}


// Redirect commands, for accessing things
// Html client
express.get('/client', function(req, res)
						{
							res.sendFile(__dirname+'/html/index.html');
						});

// Style sheet file
express.get('/css', function(req, res)
						{
							res.sendFile(__dirname+'/css/css.css');
						});
// Icon
express.get('/favicon.ico', function(req, res)
							{
								res.sendFile(__dirname+'/favicon.ico');
							});

/*
 * roomShredder: destroys and unregisters room
 * Precondition: room is a valid Room object
 * Postcondition: room no longer exists
 * Parameter: room - the room to be destroyed
 * Return value: none
 */
function roomShredder(room)
{
	console.log('Shredding ' + room.getName() + '...');
	// Find and unreg room
	for(var i = 0; i < rooms.length; i ++)
	{
		// Found room
		if(rooms[i].getName() == room.getName())
		{
			// Unreg room
			rooms.splice(i, 1);
			
		}
	}

	// Delete users
	delete room.users;
	
	// Delete room
	delete room;
	// Extra precaution because Javascript works in mysterious ways
	room = false;

	if(!room)
		console.log('Shredded!');
}

/*
 * login: finds room by name n, and returns it if p is its password
 * Precondition: n and p are valid strings (probly provided by user)
 * Postcondition: none
 * Parameters:
 *					n - name of desired room
 *					p - password for desired room
 * Return values:
 *					if n matches the name of a room and p matches its password - a Room object
 *					else - false
 */
function login(n, p)
{
	// Find room
	for(var i = 0; i < rooms.length; i ++)
	{
		// Compare name and password
		if(rooms[i].getName() == n && rooms[i].getPassword() == p)
			return rooms[i]; // Ayy, a match!
	}

	// No room found or password incorrect - return false
	return false;
}

/*
 * createRoom: creates a Room with name n and password p, if no other Room named n exists
 * Precondition: none
 * Postcondition: now there's a new Room with name n and password p
 * Parameters:
 *				n - desired name for Room
 * 			p - desired password for Room
 * Return values:
 *				if no other Room of name n exists - a new Room object of name n and password p
 *				else - false
 */
function createRoom(n, p)
{
	// Make sure we don't already have a room with this name
	for(var i = 0; i < rooms.length; i ++)
	{
		// Room already exists - error
		if(rooms[i].getName() == n)
			return false;
	}
	// Return created room
	return new Room(n, p);
}

/*
 * auth - processes new user requests
 * Precondition: socket is a valid websocket, info is a valid string
 * Postcondition: a new User exists in either a new Room or a preexisting one
 * Parameters:
 * 				socket - the websocket along which the request was delivered
 *					info - request:
 *							{
 *								info.uname - user's screenname/username
 *								info.rname - desired room name
 *								info.pass - desired room's password
 *								info.type - either 'create' or 'login', depending on what the user wants
 *							}
 * Return value: none
 */
function auth(socket, info)
{
	console.log(info.uname + " wants to " + info.type + " " + info.rname);
	// The room the user will be in
	var room = false;
	// Check if the user wants to log in or create a new room
	if(info.type == 'login')
	{
		// Login
		room = login(info.rname, info.pass);
	}
	else if(info.type == 'create')
	{
		// Create room
		room = createRoom(info.rname, info.pass);
	}

	// Make sure it went smoothly
	if(!room)
	{
		// Something happened
		console.log(info.type + " failed!");
		// Alert end user
		socket.emit(info.type + ' failed');
		// Nothing else to do		
		return;
	}
	else
	{
		// It seems things went okay
		console.log(info.type + " succeded!");
		// Create user
		var user = new User(info.uname, socket, room);
		// Add to room
		room.addUser(user);
		// Debug message
		console.log('Created ' + user.getName() + ' : ' + user.getId() + ' in ' + user.getRoom().getName() + ' (population: ' + room.getUsers().length + " + " +  room.connectionQueue.length + '); global population: ' + population);

		// Woohoo start
		user.getSocket().emit("youin", user.getId());
	}
}

/*
 * connection callback: called every time a websocket connects to the server
 * Precondition: none
 * Postcondition: ready to receive new user requests from that websocket
 * Parameter: socket - the connecting websocket
 * Return value: none
 */
io.on('connection',
		function(socket)
		{
			console.log("Someone connected!");
			// Watch for authentication data
			socket.on('auth', function(info)
									{
										info = parseJSON(info);
										console.log("Someone wants in: " + JSON.stringify(info));
										// Run authentication
										auth(socket, info);
									});
		});

// Port and ip configuration
var port = process.env.OPENSHIFT_NODEJS_PORT || 1755;
var ip = process.env.OPENSHIFT_NODEJS_IP || 'localhost';

app.listen(port, ip, function(){
		     console.log('Listening: ' + ip + ':' + port);
		     });
