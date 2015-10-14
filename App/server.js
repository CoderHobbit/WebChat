var app = require('express')();
var http = require('http').Server(app);

app.get('/', function(req, res){
		res.send('hello wolrd');
		});

http.listen(1755, function(){
		     console.log('Listening on *: 1755');
		     });
