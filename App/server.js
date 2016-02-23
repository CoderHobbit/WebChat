var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Various variables
var population = 0;
const password = 'caccculinary';
var sockets = [];
// Connection variables
// Order in which existing clients connect to a new one
var orderOfConnections = [];
// Index in order
var index = 0;
// Incoming client
var receiver = null;
// Anyone who drops by while we are establishing connections will sit here
var connectionQueue = [];
// Clients who have finished connecting to a new client
var doneClients = [];



// Redirect commands, for accessing things
// Index/client
app.get('/client', function(req, res)
						{
							res.sendFile(__dirname+'/index.html');
						});
// Cascading Style Sheets file
app.get('/css', function(req, res)
						{
							res.sendFile(__dirname+'/css.css');
						});
// HTML server
app.get('/server', function(req, res)
							{
								res.sendFile(__dirname+'/server.html');
							});
// Test HTML
app.get('/test', function(req, res)
							{
								res.sendFile(__dirname+'/test.html');
							});
// Icon
app.get('/favicon.ico', function(req, res)
							{
								res.sendFile(__dirname+'/favicon.ico');
							});

// Helper function - authentication
function auth(socket, pass)
{
	// Check if user passed, in which case we allow them to begin
	if(pass === password)
	{
		
		// Update number of users
		population++;	
		io.emit('newUser', population);
		// Preventative maintenance
		orderOfConnections.splice(0, orderOfConnections.length);
		// Queue everyone to connect
		for(var i = 0; i < sockets.length; i ++)
		{
			orderOfConnections.push(sockets[i]);
		}
		console.log('Order of connections: ', orderOfConnections.length);
		// Add current connection
		sockets.push({connection: socket, id: population});
		console.log('Registered user: ' + population + ' : ' + socket.handshake.url);
	}
	// Oops, try again
	else
		socket.emit('authFailed');
}

// On done function
function orderDone(doneId)
{
	
	console.log('Done connecting: ', doneId);
	// Last one done?
	if(doneId == orderOfConnections[orderOfConnections.length - 1].id)
	{
		console.log('All done!');
		// Reset order
		orderOfConnections.length = 0;
		index = 0;
		// Re-enable connecting
		return;
	}
	// Otherwise, trudge on
	else
	{
		// Make sure this one wasn't already done
		for(var i = 0; i < doneClients.length; i ++)
		{
			if(doneClients[i].id == doneId)
			{
				console.log('Rejected: ', doneId);
				return;
			}
		}

		// Register the finishing
		for(var i = 0; i < sockets.length; i ++)
			if(sockets[i].id == doneId)
				doneClients.push(sockets[i]);

		// Increase index
		index ++;
		// Find caller and receiver
		var caller = orderOfConnections[index];
		console.log(index, ' : ', caller.id, ' is calling ', receiver.id);
		// Have the caller call the receiver
		caller.connection.emit('start', {caller: caller.id, callto: receiver.id});
		receiver.connection.emit('start', {caller: caller.id, callto: receiver.id});
		// Basically recursion
		caller.connection.on('doneConnecting', orderDone);
		receiver.connection.on('doneConnecting', function(){/*hue*/});
	}
}

// Run order
function runOrder(callTo)
{
	if(population > 1)
	{
		// Disable adding new users, to prevent connection interference
		
		// Just to be sure
		index = 0;
		var caller = orderOfConnections[index];
		receiver = callTo;
		// Start with the first socket
		caller.connection.emit('start', {caller: caller.id, callto: receiver.id});
		receiver.connection.emit('start', {caller: caller.id, callto: receiver.id});
		// Wait until done
		caller.connection.on('doneConnecting', orderDone);
		receiver.connection.on('doneConnecting', function(){/*hue*/});
	}
}

function altOnConnection(socket)
{
	// Add everyone to queue, so that when connections finish, we can get them in as well
}

// Normal connection procedure
function onConnection(socket)
{
	// Javascript authentication
	socket.on('password', function(pass)
									{
										// Run authentication
										auth(socket, pass);
										
										// Connect
										if(sockets.length > 1)
											runOrder(sockets[sockets.length - 1]);
										
										// Oh look, got a message
										socket.on('message', function(m)
																	{
																		// Parse message
																		var info = JSON.parse(m);
																		console.log('Received message for ', info.to);
																		// Cycle through sockets
																		for(var i = 0; i < sockets.length; i ++)
																		{
																			// Pass message on to the correct socket
																			if(sockets[i] != this && info.to == sockets[i].id)
																				sockets[i].connection.send(m);
																		}
																	});
									});
	
	socket.on('disconnect', function()
									{
										// Find the dead socket
										for(var i = 0; i < sockets.length; i ++)
										{
											if(socket == sockets[i].connection)
											{
												console.log(sockets[i].id, ' has left us :(');
												// Inform the client
												io.emit('someoneLeft', sockets[i].id);
												// Remove socket
												sockets.splice(i, 1);
											}
											// Reset population if everyone has left
											if(sockets.length == 0)
												population = 0;
										}
										
									});
}

// Callback for when someone connects
io.on('connection', onConnection);

http.listen(1755, function(){
		     console.log('Listening on *: 1755');
		     });
