var express = require('express')();
var app = require('http').Server(express);
var io = require('socket.io')(app);

// Total population - for assigning ids
var population = 0;
// All the sockets
var sockets = [];
// All rooms; each room has a name, password, population, and users
var rooms = [];

function findUser(socket)
{
	// Search through all the rooms
	for(var i = 0; i < rooms.length; i ++)
	{		
		// Look at all the users
		var rm = rooms[i];

		console.log("Looking in room " + rm.getName());
		
		for(var j = 0; j < rm.getPopulation(); j ++)
		{
			// There they are?
			if(rm.getUsers()[j].getSocket() === socket)
			{
				console.log("Found!");
				return rm.getUsers()[j]; // There they are!
			}
		}	
	}

	console.log("404: User not found!");
	// Didn't find anything :/
	return false;
}

// Prototype of user
function User(screenName, socket, room)
{
	// Properties of person: name, socket, room
	this.screenName = screenName;
	this.socket = socket;
	this.room = room;
	this.id = population;

	// Increment population
	population ++;
	
	// Behaviors: setters
	this.setName = function(newName) {this.screenName = newName;};
	this.setSocket = function(newSocket) {this.socket = newSocket;};
	this.setRoom = function(newRoom) {this.room = room;};
	// Behaviors: getters
	this.getName = function() {return this.screenName;};
	this.getSocket = function() {return this.socket;};
	this.getRoom = function() {return this.room;};
	this.getId = function() {return this.id;};

	// Behavior: messenger
	// Parses and shoots socket messages to the room message handlers
	this.socket.on('message', 
						function(m)
						{	
							// Find myself
							var usr = findUser(this);
							// Add the return address
							m.from = usr.getId();
							// Parse message
							var info = JSON.parse(m);
							// Log
							console.log(usr.screenName + ' received message for ', info.to);
							// Shoot to room handler
							usr.getRoom().sendToId(info.to, 'message', m);
						});

	// Callback for disconnecting
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
	// This would be called when a user finishes doing client side reg (setting its ID, etc.)
	this.socket.on('imin',
						function() // This one is initially disabled; enabled when this is added to a room
						{
							// Disabled
						});
}

// Prototype of room
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
							this.users.push(newUser);
							// Increment population
							this.population += 1;
							console.log("Added " + newUser.getName() + " at index " + this.population - 1);
							newUser.socket.on('imin',
													function() // This one is initially disabled; enabled when this is added to a room
													{
														// Find myself
														var usr = findUser(this);
														console.log("Found: " + usr);
														// Queue up to connect
														usr.room.connectionQueue.push(usr);
														// Run order if it isn't already running
														if(!usr.room.orderIsRunning)
															usr.room.runOrder(usr);
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
								console.log(this.roomName + ': Broadcasting ' + msg + ' : ' + data);
								// Cycle through all users, send msg to each socket
								for(var i = 0; i < this.users.length; i ++)
								{
										this.users[i].getSocket().emit(msg, data);
								}
							};
	// Sends msg to specified user (must comply with user prototype above)
	this.sendToUser = function(user, msg)
							{
								console.log(this.roomName + ': Sending (' + msg + ') to ' + user.getName());
								// Make sure user is in this room
								for(var i = 0; i < this.users.length; i ++)
								{
									if(user.getId() == this.users[i].getId())
									{
										// Send message
										this.users[i].getSocket().send(msg);
									}
								}
							};

	// Emits msg and data to specified user (must comply with user prototype above)
	this.emitToUser = function(user, msg, data)
							{
								console.log(this.roomName + ': Emitting (' + msg +  ' : ' + data + ') to ' + user.getName());
								// Make sure user is in this room
								for(var i = 0; i < this.users.length; i ++)
								{
									if(user.getId() == this.users[i].getId())
									{
										// Emit message and data
										this.users[i].getSocket().emit(msg, data);
									}
								}
							};
	// Sends msg to user with specified id
	this.sendToId = function(id, msg)
							{
								console.log(this.roomName + ': Sending (' + msg + ') to ' + id);
								// Find the user
								for(var i = 0; i < this.users.length; i ++)
								{
									if(this.users[i].getId() == id)
									{
										// Send message
										this.users[i].getSocket().send(msg);
									}
								}
							};

	// Emits msg to user with specified id
	this.sendToId = function(id, msg, data)
							{
								console.log(this.roomName + ': Emitting (' + msg + ' : ' + data + ') to ' + id);
								// Find the user
								for(var i = 0; i < this.users.length; i ++)
								{
									if(this.users[i].getId() == id)
									{
										// Send message
										this.users[i].getSocket().emit(msg, data);
									}
								}
							};

	// Functional behaviors: handle the connecting process
	// Starts order of connections. This connects users in the queue (connectionQueue)
	this.runOrder = function(callTo)
	{
		if(this.population > 1)
		{
			console.log('Starting order of connections!');
			// Set state
			this.orderIsRunning = true;
			// Just to be sure, clean up order of connections
			this.orderOfConnections.length = 0;
			// Dump queue into order
			for(var i = 0; i < this.connectionQueue.length; i ++)
			{
				// Pass over callTo, if they are in the queue
				if(callTo.getId() != this.connectionQueue[i].getId())
					this.orderOfConnections.push(this.connectionQueue[i]);
			}
			console.log('Dumped queue into order');
			// Clear queue
			this.connectionQueue.length = 0;
			// Begin
			var caller = this.orderOfConnections[0];
			this.receiver = callTo;
			console.log('Got caller: ' + caller.getName() + ' : ' + caller.getId());
			// Start with the first socket
			console.log('Started!');
			caller.getSocket().emit('start', {you: 'caller', callto: this.receiver.getId()});
			this.receiver.getSocket().emit('start', {you: 'receiver', callto: caller.getId()});
			// Wait until done
			caller.getSocket().on('doneConnecting', this.orderDone);
			this.receiver.getSocket().on('doneConnecting',
													function()
													{ 
														// Debug message
														console.log(this.receiver.getName() + ' : ' + this.receiver.getID() + ' is done!');
													});
		}
	};

	// Once a user completes connecting, this fires
	// Checks if the all ordered users have connected and returns; if not, connects next user in order
	this.orderDone = function(socket)
	{
		var doneUser = this.findUser(socket);
		console.log('Done connecting: ', doneUser.getName());
		// Last one done?
		if(this.orderOfConnections.length == 0)
		{
			// See if anyone dropped by while we were all connecting
			if(this.connectionsQueue.length != 0)
			{
				// Dump queue into order, keep trudging
				this.orderOfConnections = this.connectionsQueue;
				// Reset queue
				this.connectionsQueue.length = 0;
			}
			else
			{
				// We're done!
				console.log('All done!');
				this.orderIsRunning = false;
				return;
			}
		}
		
		// Otherwise, trudge on
		// Pop order
		this.orderOfConnections = this.orderOfConnections.splice(0,1);
		// Find caller and receiver
		var caller = this.orderOfConnections[0];
		console.log(caller.getName(), ' is calling ', this.receiver.getName());
		// Have the caller call the receiver
		caller.getSocket().emit('start', {you: 'caller', callto: this.receiver.getId()});
		this.receiver.getSocket().emit('start', {you: 'receiver', callto: caller.getId()});
		// Basically recursion
		caller.getSocket().on('doneConnecting', this.orderDone);
		this.receiver.getSocket().on('doneConnecting', function(){/*Do nothing*/});
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
		console.log('Created ' + user.getName() + ' : ' + user.getId() + ' in ' + user.getRoom().getName() + ' (population: ' + (room.getUsers().length || room.getPopulation()) + '); global population: ' + population);
		
		for(i = 0; i < room.getUsers().length; i++)
			if(room.getUsers()[i] == user)
				console.log(user.getName() + " is in " + room.getName() + "!");

		// Woohoo start
		user.getSocket().emit("youin");
	}
}

// Normal connection procedure
function onConnection(socket)
{
	console.log("Someone connected!");
	// Watch for authentication data
	socket.on('auth', function(info)
							{
								info = JSON.parse(info);
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
