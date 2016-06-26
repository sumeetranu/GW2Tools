var express = require('express');
var app = express();
var port = 3000;

/*app.get('/', function(req, res){
	res.send("Hello " + req.query.name + " from server.js!");
});*/

app.use(express.static(__dirname + "/public"));


app.listen(port);
console.log('Server running on port', port);