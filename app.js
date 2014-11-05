/**
 * Module dependencies.
 */

var express = require('express'),
	 ent = require('ent'),
	sio = require('socket.io');
	
var pg = require('pg');
var fs = require("fs");
var sqlite3 = require("sqlite3").verbose();


var dbFile = "quiz.sqlite";
var exists = fs.existsSync(dbFile);
var db = new sqlite3.Database(dbFile);


/**
 * App.
 */

var app = express.createServer();

/**
 * App configuration.
 */

app.configure(function () {
  app.use(express.static(__dirname + '/'));
})

/*app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM quiz_table', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.send(result.rows); }
    });
  });
}) */

function Question (id, question, response) {
	this.id = id;
	this.question = question;
	this.response = response;
}

var currentQuestion;
var timerDuration = 10000;


db.serialize(function() {  
  db.each("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1", function(err, row) {
      console.log(row.id + ": " + row.question);
      currentQuestion = new Question (row.id, row.question, row.reponse);
  });
});





// timer
setInterval(function(){
 
  db.each("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1", function(err, row) {
      console.log(row.id + ": " + row.question);
      currentQuestion = new Question (row.id, row.question, row.reponse);
  });
  
  console.log('Timer Change question '+currentQuestion.question);
  io.sockets.emit('emit_question', currentQuestion.question);
}, timerDuration);  


/**
 * App routes.
 */

app.get('/', function (req, res) {
 res.sendfile(__dirname + '/index.html');
});

/**
 * App listen.
 */

var port = process.env.PORT || 3000;
app.listen(port, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

/**
 * Socket.IO server (single process only)
 */

var io = sio.listen(app);

// Set our transports
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 20); 
});

var users=[];
io.sockets.on('connection', function (socket) {
	 // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('login', function (user) {
            pseudo = ent.encode(user.pseudo);
			password= ent.encode(user.password);
			socket.set('pseudo', pseudo);
			users.push({pseudo:pseudo,password:password});
            socket.broadcast.emit('pseudo', pseudo);
        
    });  
	
	
	socket.on('disconnect', function() {
      console.log('User disconnect!');

   });
   
   
	    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message) {
			 socket.get('pseudo', function (error, pseudo) {
            message = ent.encode(message);
            socket.broadcast.emit('message', {pseudo: pseudo, message: message});
		});
        
    }); 

});
