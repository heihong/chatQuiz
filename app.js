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
	this.reponse = response;
}
var currentQuestion;
var nextQuestion;
var timerDuration = 10000;
var pointsToWin = 5;


db.serialize(function() {  
  db.each("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1", function(err, row) {
      console.log(row.id + ": " + row.question);
      currentQuestion = new Question (row.id, row.question, row.reponse);
      getNewQuestion();
      pointsToWin = 5;
  });
});



function getNewQuestion() {
		db.each("SELECT * FROM questions ORDER BY RANDOM() LIMIT 1", function(err, row) {
  		pointsToWin = 5;
      console.log("in timer q: "+row.question);
      console.log("in timer r: "+row.reponse);
      nextQuestion = new Question (row.id, row.question, row.reponse);
  		});
}

function getBestPlayers() {
		db.each("SELECT * FROM users ORDER BY points DESC LIMIT 5", function(err, row) {
  			console.log("best player : "+row.login+" - "+row.points);
  		});
}

setInterval(function(){


io.sockets.emit('time_finish', currentQuestion.reponse);
currentQuestion = nextQuestion;

getNewQuestion();
getBestPlayers();
		
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
	
	var login = req.body.user.login;
	var password = req.body.user.password
	
	if(login != "" && password != "") {
	
	
	login = login.toLowerCase();
		db.serialize(function() {	 
		
		 
	  	db.each("SELECT * FROM users WHERE login = '"+login+"' LIMIT 1", function(err, row) {
      	console.log(row.id + ": " + row.login);
  		}, function(err, rows) {
			  if (rows == 0) {
			  	var stmt = db.prepare("INSERT INTO users VALUES(NULL,?,?,0)");	  
				stmt.run(login, password); 
				stmt.finalize();
				}
				else {
					// erreur le pseudo existe deja !!!!!!!!!!!!!
				}
			});
  
		});
	}
	
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
		 console.log("LOGIN");
		  
			  db.each("SELECT * FROM users WHERE login = '"+pseudo+"' LIMIT 1", function(err, row) {
					console.log("db login : "+row.login);
					console.log("db pass : "+row.password);
					dbPassword = row.password;
			  }, function(err, rows) {
			  if (rows =! 0) {
				 
				 console.log("enter : "+password);
				console.log("dppass : "+dbPassword);
				if(password == dbPassword && dbPassword != "") {
				socket.set('pseudo', pseudo);
				users.push({pseudo:pseudo,password:password});
		         socket.broadcast.emit('pseudo', pseudo);
				}
				else {
					 // wrong password or login redirect with error
				}
			}
			});
			
		
        
    });  
	
	
	socket.on('disconnect', function() {
      console.log('User disconnect!');

   });
   
   
	    // Dès qu'on reçoit un message, on récupère le pseudo de son auteur et on le transmet aux autres personnes
    socket.on('message', function (message) {
			socket.get('pseudo', function (error, pseudo) {
			console.log("RESPONSE FROM : "+pseudo);
            message = ent.encode(message);
            
            if(message.toLowerCase() == currentQuestion.reponse.toLowerCase()) {
             	console.log('GOOD RESPONSE !!! '+currentQuestion.reponse);
             	var currentPoints = 0;
             	var id = 0;
             	db.each("SELECT * FROM users WHERE login = '"+pseudo+"' LIMIT 1", function(err, row) {
					console.log("db points : "+row.points);
					id = row.id;
					currentPoints = row.points + pointsToWin;
					
					
			  }, function(err, rows) {
				  if(rows != 0) {
					  
					  // first to have the good response have 5 points, second 3, third 2 and others 1
					  if(pointsToWin > 1) {
						  if(pointsToWin == 5) {
							  pointsToWin--;
						  }
						  pointsToWin--;
					  }
					db.run("UPDATE users SET points = '"+currentPoints+"' WHERE id = ?", id);
				}
			}
			);
             	     	
             	io.sockets.emit('good_response', pseudo);
            }
            else {
            	socket.broadcast.emit('message', {pseudo: pseudo, message: message});
            }
           
		});
        
    }); 

});
