var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Various variables
var population = 0;
var sockets = [];

app.get('/index', function(req, res)
						{
							res.sendFile(__dirname+'/index.html');
						});
app.get('/css', function(req, res)
						{
							res.sendFile(__dirname+'/css.css');
						});
app.get('/server', function(req, res)
							{
								res.sendFile(__dirname+'/server.html');
							});
app.get('/test', function(req, res)
							{
								res.sendFile(__dirname+'/test.html');
							});
app.get('/favicon.ico', function(req, res)
							{
								res.sendFile(__dirname+'/favicon.ico');
							});

io.broadcast = function(data)
					{
						for(var i = 0; i < sockets.length; i ++)
						{
							sockets[i].send(data);
						}
					};

// Callback for when someone connects
io.on('connection', 
			function(socket)
			{
				sockets.push(socket);

				// Update number of users
				population++;	
		
				io.emit('newUser', population);

				console.log('Registered user: ' + population + ' : ' + socket.handshake.url);

				socket.on('newVideo', function(data)
												{
													for(var i = 0; i < sockets.length; i ++)
														sockets[i].emit('heresData', data);
												});

				socket.on('disconnect', function()
												{
													console.log('Someone left' + socket.handshake.url);
													// Inform the client
													io.emit('someoneLeft');
													// Update number of users
													population--;
												});
				socket.on('message', function(m)
											{
												io.broadcast(m);
											});
			});

http.listen(1755, function(){
		     console.log('Listening on *: 1755');
		     });
