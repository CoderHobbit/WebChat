var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var nodeRTC = require('peerconnection');

// Various variables
var population = 0;
var rooms = [];
var users = [];

// Redirect to index.html
app.get('/', function(req, res){
		res.sendFile(__dirname + '/index.html');
		});

/*
// Creates a room
function createRoom(info, user)
{
	// Instantiate a room
	var aRoom = {clients : [], numUsers : 0, id : '', pass : ''};
	// Set the ID and password
	aRoom.id = ;
	//aRoom.pass = info.newPass;
	// Add the user to the room
	addUserToRoom(user, aRoom);
	// Add room to the room list
	rooms.push(aRoom);
}

// Adds a user to a room
function addUserToRoom(usr, rm)
{
	rm.numUsers ++;
	rm.clients.push(usr);
}

// Removes a user
function removeUser(usrId)
{
	// Cycle through all the rooms
	for(var i = 0; i < rooms.length; i ++)
	{
		// Look at each user
		for(var j = 0; j < rooms[i].clients.length; j++)
		{
			// If the id matches, remove user
			if(usrId == rooms[i].clients[j].id)
			{
				// Remove user
				rooms[i].clients.splice(j, 1);
			}
		}
	}
}*/


// Initiates a user and opens the datachannel
function newUser(usr)
{
	users.push(usr);
}

// Callback for when someone connects
io.on('connection',function(socket)
		   {
			console.log('a user connected');

			// Instantiate a user
			var usr = {id : '', dataChannel : null};
			// Update number of users
			population++;
			// Set id
			usr.id = population;
		
			// Set up datachannel and whatnot
			newUser(usr);

			socket.on('offer', function( sdp ) {
			    console.log( "New offer:" );
			    console.log( sdp.sdp );

			    // Create the PeerConnection and setRemoteDescription from the offer.
			    var c = new nodertc.PeerConnection();
			    c.setRemoteDescription( sdp );
			    users[population].dataChannel = c;


			    // Callbacks
			    c.on( 'icecandidate', function( evt ) {
				// New ice candidate from the local socket.
				// Emit it to the browser.
				socket.emit( 'icecandidate', evt );
			    });

			    c.on( 'answer', function( evt ) {
				// Answer from the local socket.
				// Emit it to the browser.
				socket.emit( 'answer', evt );
			    });

			    c.onAddStream(function(stream){
					  	for(var i = 0; i < users.length; i++)
						{
							io.emit('dataIncoming', users[i].id);
							users[i].dataChannel.AddStream(stream);
						}
					  });

			    socket.on( 'icecandidate', function( evt ) {
				// icecandidate from the remote connection,
				// add it to the local connection.
				c.addIceCandidate( evt );
			    });
			});
			socket.on('disconnect', function()
						{
							console.log('user disconnected: ');
							// Check who left
							for(index = 0; index < users.length; index ++)
							{
								// If the mediastream is null, the user must've left
								if(!users[index].dataChannel)
								{
									console.log(users[index].id);
									// Delete dead users
									users.splice(index, 1);
								}
							}
							// Inform the client
							io.emit('someoneLeft', users);
							// Update number of users
							population--;
						});
		});

http.listen(1755, function(){
		     console.log('Listening on *: 1755');
		     });
