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
var timerDuration = 30000;	// 30 seconds between each question
var pointsToWin = 5;
var bestPlayers = new Array();


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
		var i = 0;
		bestPlayers = new Array(5);
		for(i = 0; i<bestPlayers.length;i++) {
			bestPlayers[i] = "";
		}
		i = 0;
		db.each("SELECT * FROM users ORDER BY points DESC LIMIT 5", function(err, row) {
  			console.log("best player : "+row.login+" : "+row.points);
  			bestPlayers[i] = row.login+" : "+row.points+" points";
  			i++;
  		}, function(err, rows) {
  			io.sockets.emit('best_players_update', {p1: bestPlayers[0], p2: bestPlayers[1], p3: bestPlayers[2], p4: bestPlayers[3], p5: bestPlayers[4]});
  		});
  		
  		
}

// set a timer of 30 seconds to refresh questions
setInterval(function(){


	io.sockets.emit('time_finish', currentQuestion.reponse);
	currentQuestion = nextQuestion;

	getNewQuestion();
	getBestPlayers();
		
 	io.sockets.emit('emit_question', currentQuestion.question);
  	
  // set a timer each seconds to refresh remaining time
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

app.get('/signinerror',function(req,res){
  res.sendfile( '/signinerror.html' , {root:__dirname});

});
app.get('/signinvalid',function(req,res){
  res.sendfile( '/signinvalid.html' , {root:__dirname});

});

app.get('/loginerror',function(req,res){
  res.sendfile( '/loginerror.html' , {root:__dirname});

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
				res.redirect('/signinvalid');
				}
				else {
					// login exist user have to choose another one
						res.redirect('/signinerror');
				}
			});
  
		});
	}
	
  res.sendfile( '/signin.html' , {root:__dirname});

});

/**
 * App listen.
 */

// server will be on localhost:3000
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

// a new user is connected
io.sockets.on('connection', function (socket) {
	 
    socket.on('login', function (user) {
         pseudo = ent.encode(user.pseudo);
			password= ent.encode(user.password);
			
			var dbPassword = "";
		 	console.log("New login");
		  	// check login and password in database
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
					socket.emit('redirect');
					 // wrong password or login redirect with error					 
				}
			}
			});
			
		
        
    });  
	
	
	socket.on('disconnect', function() {
      console.log('User disconnect!');

   });
   
   
	 // new message received   
    socket.on('message', function (message) {
			socket.get('pseudo', function (error, pseudo) {
		
         message = ent.encode(message);
            
         if(message.toLowerCase() == currentQuestion.reponse.toLowerCase()) {
             	console.log('Good response : '+currentQuestion.reponse);
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
					// update points for the user  
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
