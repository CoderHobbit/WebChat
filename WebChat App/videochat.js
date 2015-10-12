// Error callback function 
function fail(error) 
{ 
	console.log("-navigator.getUserMedia has failed!");
	console.log("-Alerting you of error...");
	alert("Oops lol! " + error);
	console.log("-Calling greet!");
	greet();
	console.log("Done, returning...");
}


// Success callback function
function work(mediaStream)
{
	console.log("-navigator.getUserMedia has succeeded!");
	console.log("-Setting 'video' URL to stream video URL!");

	document.getElementById("video").src = window.URL.createObjectURL(mediaStream);

	console.log("-URL set, saying hello!");
	alert("Hello!");
	console.log("Done, returning...");
}


function doTheCameraThing()
{
	console.log("-Started doing the camera thing!");
	// Configure navigator.getUserMedia
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	
	console.log("-Configured getUserMedia!");	

	if(navigator.getUserMedia)
	{
		console.log("-getUserMedia is supported!");
		// Constraints for getUserMedia - we only want video
		var constraints = {video: true, audio: true};
		console.log("-Generated constraints!");
		
		console.log("-Calling navigator.getUserMedia...");
		// Call getUserMedia
		navigator.getUserMedia(constraints, work, fail);
		console.log("-navigator.getUserMedia has returned!");
	}
	else
	{
		alert('getUserMedia() is not supported!');
	}
}

function connect()
{
		bit
}

function greet()
{
	alert("ayy lmao");
	document.write('<img src = "http://i.ytimg.com/vi/kiEqGhgWf5Y/maxresdefault.jpg" alt = "ayylmao" height = "420" width = "420">');
	
}
