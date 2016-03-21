var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Total population - for assigning ids
var population = 0;
// All the sockets
var sockets = [];
// All rooms; each room has a name, password, population, and users
var rooms = [];


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

	// Callback helpers - get called by socket functions
	static messageHelper = function(m)
								{
									// Parse message
									var info = JSON.parse(m);
									// Log
									console.log(this.screenName + ' received message for ', info.to);
									// Shoot to room handler
									this.room.sendToId(info.to, 'message', m);
								}

	static disconnectHelper = function()
									{
										console.log(this.screenName + ' has left us!');
										this.room.removeUser(this);
										if(this.room.getPopulation() <= 0)
										{
											// Delete empty room
											roomShredder(this.room);
										}
									}
	static iminHelper = function() // This one is initially disabled; enabled when this is added to a room
							{
								// Queue up to connect
								this.room.connectionQueue.push(this);
								// Run order if it isn't already running
								if(!this.room.orderIsRunning)
									this.room.runOrder(this.room.connectionQueue[0]);
							}


	// Behavior: messenger
	// Parses and shoots socket messages to the room message handlers
	this.socket.on('message', this.messageHelper);
	// Callback for disconnecting
	this.socket.on('disconnect', this.disconnectHelper);
	// This would be called when a user finishes doing client side reg (setting its ID, etc.)
	this.socket.on('imin',
						function()
						{
							// Disabled until this is added to a room
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
	// Index in order
	this.index = 0;
	// Incoming client
	this.receiver = null;
	// State variable - for extra safety
	this.orderIsRunning = false;
	// Anyone who drops by while we are establishing connections will sit here
	this.connectionQueue = [];
	// Clients who have finished connecting to a new client
	this.doneClients = [];
	
	// Behaviors: setters
	this.setName = function(newName) {this.roomName = newName;};
	this.setPassword = function(newPassword) {this.password = newPassword;};
	// Behaviors: getters
	this.getName = function() {return this.roomName;};
	this.getPassword = function() {return this.password;};
	this.getUsers = function() {return this.population;};
	this.getPopulation = function() {return this.users;};
	
	// Behaviors: adder
	this.addUser = function(newUser)
						{
							// Enabled the 'imin' callback
							newUser.getSocket().on('imin', newUser.iminHelper);
							// Register user
							this.users.push(newUser);
							// Increment population
							this.population += 1;
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
								for(var i = 0; i < this.doneClients.length; i ++)
								{
									if(this.doneClients[i].getId() == ripUser.getId())
									{
										// Remove									
										this.doneClients.splice(i, 1);
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
										this.users[i].getSOcket().send(msg);
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
										this.users[i].getSOcket().emit(msg, data);
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
		console.log(this.roomName + ' has ' + this.population + ' users!');
		if(this.population > 1)
		{
			console.log('Starting order of connections!');
			// Set state
			orderIsRunning = true;
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
			this.index = 0;
			var caller = this.orderOfConnections[this.index];
			this.receiver = callTo;
			console.log('Got caller: ' + caller.getName() + ' : ' + caller.getId());
			// Start with the first socket
			console.log('Started!');
			caller.getSocket().emit('start', {caller: caller.getId(), callto: this.receiver.getId()});
			this.receiver.getSocket().emit('start', {caller: caller.getId(), callto: this.receiver.getId()});
			// Wait until done
			caller.getSocket().on('doneConnecting', this.orderDone);
			this.receiver.getSocket().on('doneConnecting',
													function()
													{ 
														// Debug message
														console.log(this.receiver.getName() + ' : ' + this.receiver.getID() + ' is done!');
													});
		}
	}

	// Once a user completes connecting, this fires
	// Checks if the all ordered users have connected and returns; if not, connects next user in order
	this.orderDone = function(doneId)
	{
		console.log('Done connecting: ', doneId);
		// Last one done?
		if(doneId == this.orderOfConnections[this.orderOfConnections.length - 1].getId())
		{
			console.log('All done!');
			// Reset order
			this.orderOfConnections.length = 0;
			this.index = 0;
			this.doneClients.length = 0;
			// If anyone is queued up, re-run
			if(this.connectionQueue.length > 0)
				this.runOrder(this.connectionQueue[0]);
			return;
		}
		// Otherwise, trudge on
		else
		{
			// Make sure this one wasn't already done
			for(var i = 0; i < this.doneClients.length; i ++)
			{
				if(this.doneClients[i].getId() == doneId)
				{
					console.log('Rejected: ', doneId);
					return;
				}
			}

			// Register the finishing
			for(var i = 0; i < this.users.length; i ++)
				if(this.users[i].getId() == doneId)
					this.doneClients.push(this.users[i]);

			// Increase index
			this.index ++;
			// Find caller and receiver
			var caller = this.orderOfConnections[this.index];
			console.log(this.index, ' : ', caller.getName(), ' is calling ', this.receiver.getName());
			// Have the caller call the receiver
			caller.getSocket().emit('start', {caller: caller.getId(), callto: this.receiver.getId()});
			this.receiver.getSocket().emit('start', {caller: caller.getId(), callto: this.receiver.getId()});
			// Basically recursion
			caller.getSocket().on('doneConnecting', this.orderDone);
			this.receiver.getSocket().on('doneConnecting', function(){/*Do nothing*/});
		}
	}

	// Register room
	rooms.push(this);
}


// Redirect commands, for accessing things
// Html client
app.get('/client', function(req, res)
						{
							res.sendFile(__dirname+'/html/index.html');
						});

// Cascading Style Sheets file
app.get('/css', function(req, res)
						{
							res.sendFile(__dirname+'/css/css.css');
						});
// Icon
app.get('/favicon.ico', function(req, res)
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
	console.log("Got auth request: " + JSON.stringify(info));
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
		console.log('New room: ' + room.getName() + '; pop: ' + room.getPopulation());
		// Create user
		var user = new User(info.uname, socket, room);
		// Debug message
		console.log('Created ' + user.getName() + ' : ' + user.getId() + ' in ' + user.getRoom().getName() + '; global population: ' + population);
		// Add to room
		room.addUser(user);
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
								info = JSON.parse(info);
								console.log("Someone wants in: " + JSON.stringify(info));
								// Run authentication
								auth(socket, info);
							});
}

// Callback for when someone connects
io.on('connection', onConnection);

http.listen(1755, function(){
		     console.log('Listening on *: 1755');
		     });
