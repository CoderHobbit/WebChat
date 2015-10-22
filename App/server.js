var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var prompt = require('prompt');

var Person = 	{
			mySocket : null,
			myRoomId : ""
		};

var Room =	{
		users : [],
		roomId : "",
		password : ""
		};
var rooms = [];


app.get('/', function(req, res){
		res.sendFile(__dirname + '/index.html');
		});
prompt.start();

io.on('connection', 
	function(socket){
		console.log('a user connected');
		
		var person = new Object();
		person.mySocket = socket;
		person.myRoomId = null;

		io.emit('joinRoom');

		socket.on('login', function(info){
							// Loop through all current rooms
							for(index = 0; index < rooms.length; index ++)
							{
								// Check each room id
								if(rooms[index].roomId == info.id && info.pass == room[index].password)
								{
									// Join
									room[index].users.push(person);
									person.myRoomId = room[index].roomId;			
								}
							}
							// If room was not found, create one
							if(person.myRoomId == null)
							{
								var room = new Object();
								room.roomId = info.id;
								room.password = info.pass;
								room.users.push(person);
								rooms.push(room);
							}
						 });
		
		

		// Media callback
		socket.on("media", function(localMediaStream)
				   {
					io.emit("remoteMedia", localMediaStream);
				   });

		socket.on('disconnect',
			function(){
				console.log('user disconnected');
			});
	});

http.listen(1755, function(){
		     console.log('Listening on *: 1755');
		     });
