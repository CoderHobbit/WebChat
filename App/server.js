var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Various variables
var population = 0;
var user = {id : '', dataChannel : null};
var room = {clients : [], numUsers : 0, id : '', pass : ''};
var rooms = [];

// Redirect to index.html
app.get('/', function(req, res){
		res.sendFile(__dirname + '/index.html');
		});

peerConnection = webkitRTCPeerConnection || mozRTCPeerConnection || RTCPeerConnection;

// Prepare a peerConnection
var config = {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]};
var connection = {'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }]};
// Create peer connection
var peerConnection = new peerConnection(config, connection);

// Gather ice candidates
peerConnection.onicecandidate = function(e){
						if(!peerConnection || !e || !e.candidate)
							return;
						else
							sendNegotiation("candidate", e.candidate);
					   }
/*
// Creates a room
function createRoom(info, user)
{
	// Instantiate a room
	var aRoom = new room;
	// Set the ID and password
	aRoom.id = info.newId;
	aRoom.pass = info.newPass;
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
}

// Handle ice candidates
function proccessIce(iceCand)
{
	peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
}

// Process answers
function processAnswer(answer)
{
	peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

// Initiates a user and opens the datachannel
function newUser(u)
{
	// Create data channel
	u.dataChannel = peerConnection.createDataChannel("dc" + u.id, {reliable : false});
	// Set data channel event handling
	u.dataChannel.onmessage = function(event)
				  {
					// Stream came in, send it to all other users
					// Find this user's room
					var userRoom;
					for(var i = 0; i < rooms.length; i ++)
					{
						for(var j = 0; j < rooms[i].clients.length; j ++)
						{
							if(rooms[i].clients[i].id == u.id)
							{
								userRoom = rooms[i];
							}
						}
					}
					// Make sure user room was found
					if(userRoom)
					{
						// Send data to all other users in the room
						for(var index = 0; index < userRoom.clients.length; index ++)
						{
							userRoom.clients[index].dataChannel.send("vid", event);
						}
					}
				  };
	// Create sdp constraints
	var constr = {'mandatory' : {'OfferToReceiveAudio' : true, 'OfferToReceiveVideo' : true}};
	// Create an offer, set local description, send offer
	peerConnection.createOffer(function(sdp){
				   	peerConnection.setLocalDescription(sdp);
					sendNegotiation("offer", sdp);}, null, constr);
				   }	
}
*/
// Callback for when someone connects
io.on('connection',function(socket)
		   {
			console.log('a user connected');

			// Instantiate a user
			var usr = new user;
			// Update number of users
			population++;
			// Set id
			usr.id = population;
		
			// Set up datachannel and whatnot
			newUser(usr);

			// Media callback
			socket.on('localMedia', function(localUser)
					   	{
							console.log('got media');
							users.push(localUser);
							console.log('new m8: ' + localUser.id);
							io.emit('remoteMedia', users);
					   	});

			socket.on('disconnect', function()
						{
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
