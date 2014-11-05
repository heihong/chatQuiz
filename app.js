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
app.use(express.bodyParser());

/**
 * App configuration.
 */

app.configure(function () {
  app.use(express.static(__dirname + '/'));
})


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
 
 	
  
  console.log('Timer Change question '+currentQuestion.question);
  io.sockets.emit('emit_question', currentQuestion.question);
  var i = (timerDuration/1000);
  var timer = setInterval(function(){  
  		i--;
	  io.sockets.emit('timer_update', i);
	  
	  if(i <= 0) {
	  	i = (timerDuration/1000);
	  	clearInterval(timer);
	  }
  }, 1000); 
  
 db.each("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1", function(err, row) {
      console.log(row.id + ": " + row.question);
      currentQuestion = new Question (row.id, row.question, row.reponse);
  });
  
}, timerDuration);  


/**
 * App routes.
 */

app.get('/', function (req, res) {
 res.sendfile(__dirname + '/index.html');
});

app.get('/signin',function(req,res){
  res.sendfile( '/signin.html' , {root:__dirname});

});

app.post('/signin',function(req,res){
	console.log(req.body.user.login);
	
	db.serialize(function() {
  
  
	var stmt = db.prepare("INSERT INTO users VALUES(NULL,?,?,0)");
  
	stmt.run(req.body.user.login, req.body.user.password); 
	stmt.finalize();
});
	
  res.sendfile( '/signin.html' , {root:__dirname});

});

/**
 * App listen.
 */

var port = process.env.PORT || 3000;
app.listen(port, function () {
  var addr = app.address();
  console.log('app listening on http://' + addr.address + ':' + addr.port);
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
			
		var dbPassword = "";
		
		db.serialize(function() {  
			  db.each("SELECT * FROM users WHERE login = '"+pseudo+"' LIMIT 1", function(err, row) {
					console.log(row.login);
					dbPassword = row.password;
			  });
			});
		
		   
			if(password == dbPassword) {
			socket.set('pseudo', pseudo);
			users.push({pseudo:pseudo,password:password});
            socket.broadcast.emit('pseudo', pseudo);
		   }
		   else {
		   	 // wrong password or login
		   }
			
			
        
    });  
	
	
	socket.on('disconnect', function() {
      console.log('User disconnect!');

   });
   
   
	    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message) {
			 socket.get('pseudo', function (error, pseudo) {
            message = ent.encode(message);
            if(message.toLowerCase() == currentQuestion.response.toLowerCase()) {
             	console.log('GOOD RESPONSE !!! '+currentQuestion.response);
             	io.sockets.emit('good_response', pseudo);
            }
            else {
            	socket.broadcast.emit('message', {pseudo: pseudo, message: message});
            }
           
		});
        
    }); 

});
