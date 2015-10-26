var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var prompt = require('prompt');

var numUsers = 0;
var users = [];


app.get('/', function(req, res){
		res.sendFile(__dirname + '/index.html');
		});

io.on('connection', 
	function(socket){
		console.log('a user connected');
		
		// Update number of users
		numUsers++;
		// Inform the client
		io.emit('newUser', numUsers);

		// Media callback
		socket.on('localMedia', function(localUser)
				   {
					console.log('got media');
					users.push(localUser);
					localUser.id = numUsers;
					console.log('new m8: ' + localUser.id);
					io.emit('remoteMedia', users);
				   });

		socket.on('disconnect',
			function(){
				console.log('user disconnected: ');
				// Check who left
				for(index = 0; index < users.length; index ++)
				{
					// If the mediastream is null, the user must've left
					if(!users[index].mediaStream)
					{
						console.log(users[index].id);
						// Delete dead users
						users.splice(index, 1);
					}
				}
				// Inform the client
				io.emit('someoneLeft', users);
				// Update number of users
				numUsers--;
				
			});
	});

http.listen(1755, function(){
		     console.log('Listening on *: 1755');
		     });
