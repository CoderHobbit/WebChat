// Various variables
var localStream, localPeerConnection, remotePeerConnection;
var localVideo = document.getElementById("localvideo");
var remoteVideo = document.getElementById("incomingvideo");
var startButton = document.getElementById("startbutton");
var callButton = document.getElementById("callbutton");
var hangupButton = document.getElementById("hangupbutton");

// Configure getUserMedia
navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.getUserMedia || navigator.mozGetUserMedia;

// Configure RTCPeerConnection
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

// Configure buttons
startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = false;

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

function trace(text){
	// Log messages to the console
	console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function gotStream(stream)
{
	trace("Got stream!");
	// Stream vdieo
	localVideo.src = URL.createObjectURL(stream);	
	localStream = stream;
	// Enable call button
	callButton.disabled = false;
}

function start(){
	trace("Requesting local stream!");
	// Disable start button
	startButton.disabled = true;
	// Get user media
	navigator.getUserMedia({audio: true, video: true}, gotStream, function(error) {trace("getUserMedia error: ", error);});
}

function call(){
	// Disable call button
	callButton.disabled = true;
	// Enable hangup button
	hangupButton.disabled = false;
	
	trace("Starting call");
	
	// Check if using video and audio
	if(localStream.getVideoTracks().length > 0){
		trace("Using video device: " + localStream.getVideoTracks()[0].label);	
	}
	if(localStream.getAudioTracks().length > 0){
		trace("Using audio device: " + localStream.getAudioTracks()[0].lable);
	}
	
	var servers = null;
	// Connect locally
	localPeerConnection = new RTCPeerConnection(servers);
	trace("Created local peer connection object localPeerConnection");
	localPeerConnection.onicecandidate = gotLocalIceCandidate;

	// Connect remotely
	remotePeerConnection = new RTCPeerConnection(servers);
	trace("Created remote peer connection object remotePeerConnection");
	remotePeerConnection.onicecanddiate = gotRemoteIceCandidate;
	remotePeerConnection.onaddstream = gotRemoteStream;

	// Add localStream to localPeerConnection
	localPeerConnection.addStream(localStream);
	trace("Added localStream to localPeerConnection");
	localPeerConnection.createOffer(gotLocalDescription, handleError);
}

function gotLocalDescription(description){
	// Set the description
	localPeerConnection.setLocalDescription(description);
	trace("Offer from localPeerConnection: \n" + description.sdp);
	remotePeerConnection.setRemoteDescription(description);
	remotePeerConnection.createAnswer(gotRemoteDescription, handleError);
}

function gotRemoteDescription(description){
	remotePeerConnection.setLocalDescription(description);
  	trace("Answer from remotePeerConnection: \n" + description.sdp);
  	localPeerConnection.setRemoteDescription(description);
}

function hangup(){
	trace("Endging Call");
	localPeerConnection.close();
	remotePeerConnection.close();
	localPeerConnection = null;
	remotePeerConnection = null;
	hangupButton.disabled = true;
	callButton.disabled = false;
}

function gotRemoteStream(event){
	remoteVideo.src = URL.createObjectURL(event.stream);
	trace("Received remote stream");
}

function gotLocalIceCandidate(event){
	if(event.candidate){
		remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
		trace("Local ICE candidate: \n" + event.candidate.candidate);	
	}
}

function gotRemoteIceCandidate(event){
	if(event.candidate){
		localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
		trace("Remote ICE candidate: \n" + event.candidate.candidate);
	}
}

function handleError(){}



