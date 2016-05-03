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
 *				screenName is a valid string passed by user;
 *				room is a valid Room;
 *				socket is a valid websocket.
 * Postcondition: created a new User (DOES NOT add to room - idk why, design choices - do that manually).
 * Parameters: 
 *				screenName - user's desired name; 
 *				socket - user's websocket;
 *				room - room user will be in.
 * Return value: a User object.
 * 
 * Attributes:
 *				this.screenName - screen name corresponding to the User;
 *				this.socket - websocket corresponding to the User;
 *				this.room - room containing this User;
 *				this.id - User's ID, assigned automatically.
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
	 * Precondition: none really.
	 *	Postcondition: socket responds to messages.
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
 * Object Prototype Room: an object prototype representing a room
 * Precondition: no other room called roomName exists; roomName and password are valid strings
 * Postcondition: a new room with name roomName and password password
 * Parameters:
 *				roomName - desired name of room 
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
	
	// Behaviors: adder
	this.addUser = function(newUser)
						{
							// Register user
							this.connectionQueue.push(newUser);
							// Increment population
							this.population += 1;
							console.log("Added " + newUser.getName() + " at index " + this.population - 1);
							newUser.socket.on('imin',
													function() // This one is initially disabled; enabled when this is added to a room
													{
														// Find myself
														var usr = findUser(this);
														console.log("Found: " + usr.getName());
														// Queue up to connect
														//usr.room.connectionQueue.push(usr);
														// Run order if it isn't already running
														if(!usr.room.orderIsRunning)
															usr.room.runOrder();
													});
						};
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

	// Behaviors: messengers
	// Emits contents of msg to all users in the room
	this.broadcast = function(msg, data)
							{
								//console.log(this.roomName + ': Broadcasting ' + msg + ' : ' + data);
								// Cycle through all users, send msg to each socket
								for(var i = 0; i < this.users.length; i ++)
								{
										this.users[i].getSocket().emit(msg, data);
								}
							};
	// Sends msg to specified user (must comply with user prototype above)
	this.sendToUser = function(user, msg)
							{
								console.log(this.roomName + ': Sending message to ' + recip.getName());
								// Send message
								user.getSocket().send(msg);
							};

	// Emits msg and data to specified user (must comply with user prototype above)
	this.emitToUser = function(user, msg, data)
							{
								// Find the user
								var recip = findUserById(id);
								console.log(this.roomName + ': Emitting message to ' + recip.getName());
								// Send message
								recip.getSocket().emit(msg, data);
							};
	// Sends msg to user with specified id
	this.sendToId = function(id, msg)
							{
								
								// Find the user
								var recip = findUserById(id);
								console.log(this.roomName + ': Sending message to ' + recip.getName());
								// Send message
								recip.getSocket().send(msg);

							};

	// Emits msg to user with specified id
	this.emitToId = function(id, msg, data)
							{
								// Find the user
								var recip = findUserById(id);
								console.log(this.roomName + ': Sending message to ' + recip.getName());
								// Send message
								recip.getSocket().emit(msg, data);
							};

	// Functional behaviors: handle the connecting process
	// Starts order of connections. This connects users in the queue (connectionQueue)
	this.runOrder = function()
	{
		console.log("Populations: " + this.users.length + " + " + this.connectionQueue.length);
		if(this.users.length >= 1)
		{
			console.log('Starting order of connections!');
			// Set state
			this.orderIsRunning = true;
			// Just to be sure, clean up order of connections
			this.orderOfConnections.length = 0;
			// Dump users into order, skip over the one's in the Queue
			this.orderOfConnections = this.users.slice(0, this.users.length);
			console.log('Dumped users into order: ' + this.orderOfConnections.length);
			// Begin
			var caller = this.orderOfConnections[0];
			this.receiver = this.connectionQueue[0];
			console.log('Got caller: ' + caller.getName() + ' : ' + caller.getId());
			console.log('Got receiver: ' + this.receiver.getName() + ' : ' + this.receiver.getId());
			// Start with the first socket
			console.log('Started!');
			caller.getSocket().emit('start', JSON.stringify({you: 'caller', callto: this.receiver.getId()}));
			this.receiver.getSocket().emit('start', JSON.stringify({you: 'receiver', callto: caller.getId()}));
			// Wait until done
			caller.getSocket().on('doneConnecting', this.orderDone);
			this.receiver.getSocket().on('doneConnecting',
													function()
													{ 
														// Debug message
														console.log('Someone is done!');
													});
		}
		else if(this.connectionQueue.length > 1)
		{
			console.log("Transferring single user from queue into users");
			// Clip queue
			this.users.push(this.connectionQueue[0]);
			this.connectionQueue.splice(0,1);
			// Rerun this function
			this.runOrder();
		}
		else
		{
			
			// Dump whole queue into users
			this.users = this.connectionQueue.splice(0, this.connectionQueue.length);
			console.log("Pushed whole queue into users: " + this.users.length);
			return;
		}
	};

	// Once a user completes connecting, this fires
	// Checks if the all ordered users have connected and returns; if not, connects next user in order
	this.orderDone = function(id)
	{
		var doneUser = findUserById(id);
		var room = doneUser.getRoom();
		console.log('Done connecting: ', doneUser.getName());
		// Pop order
		console.log(room.users.length);
		room.orderOfConnections.splice(0,1);
		console.log(room.orderOfConnections.length + " users to go!");
		console.log(room.users.length);
		// Last one done?
		if(room.orderOfConnections.length == 0)
		{
			// Push new user
			console.log("Registered connected user: " + room.connectionQueue[0].getName());
			room.getUsers().push(room.connectionQueue[0]);
			// Clip connection queue
			room.connectionQueue.splice(0,1);
			// See if anyone remains in the queue
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
		
		// Otherwise, trudge on
		// Find caller and receiver
		var caller = room.orderOfConnections[0];
		console.log('Got caller: ' + caller.getName() + ' : ' + caller.getId());
		console.log('Got receiver: ' + room.receiver.getName() + ' : ' + room.receiver.getId());
		// Have the caller call the receiver
		caller.getSocket().emit('start', {you: 'caller', callto: doneUser.getRoom().receiver.getId()});
		room.receiver.getSocket().emit('start', {you: 'receiver', callto: caller.getId()});
		// Basically recursion
		caller.getSocket().on('doneConnecting', room.orderDone);
		room.receiver.getSocket().on('doneConnecting', function(){console.log("Someone is done!");});
	};

	// Register room
	rooms.push(this);
}


// Redirect commands, for accessing things
// Html client
express.get('/client', function(req, res)
						{
							res.sendFile(__dirname+'/html/index.html');
						});

// Cascading Style Sheets file
express.get('/css', function(req, res)
						{
							res.sendFile(__dirname+'/css/css.css');
						});
// Icon
express.get('/favicon.ico', function(req, res)
							{
								res.sendFile(__dirname+'/favicon.ico');
							});

// Destroys and unregisters room
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
	// Extra precaution because Javascript behaves in mysterious ways
	room = false;

	if(!room)
		console.log('Shredded!');
}

// Login
function login(n, p)
{
	// Find room
	for(var i = 0; i < rooms.length; i ++)
	{
		// If found - return that room
		if(rooms[i].getName() == n && rooms[i].getPassword() == p)
			return rooms[i];
	}

	// No room found - return false
	return false;
}

// Create a room
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

// Authentication - logs into or creates a room
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
		console.log(info.type + " failed!");
		// Something happened
		socket.emit(info.type + ' failed');
		// Await new packet		
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

// Normal connection procedure
function onConnection(socket)
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
}

// Callback for when someone connects
io.on('connection', onConnection);

// Port and ip configuration
var port = process.env.OPENSHIFT_NODEJS_PORT || 1755;
var ip = process.env.OPENSHIFT_NODEJS_IP || 'localhost';

app.listen(port, ip, function(){
		     console.log('Listening: ' + ip + ':' + port);
		     });
