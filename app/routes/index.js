'use strict';

var path = require('path');
var pug = require('pug');
var bodyParser = require('body-parser');
var User = require('../models/users.js');
var books = require('google-books-search');


module.exports = function (io, app, passport) {

app.use(bodyParser.urlencoded({ extended: true }));


var header, image, snippet, title, mylist, object, message, bookUser;
var allbooks=[];
var incomingRequests = [];
var outgoingRequests = [];

function bookSearch (book, callback) {
	books.search(book, function(err, results) {
			if (err) return console.log(err);
			image = results[0].thumbnail;
			snippet = results[0].description.substr(0, 500)+"...";
			title = results[0].title;
			object = {
				title: title,
				snippet: snippet,
				image: image,
				trades: []
			};
			saveBook(object);
			callback();
		});
};

function saveBook (object) {
	User.findOne({username: bookUser}, function(err, user) {
		if (err) return console.log(err);
		user.books.push(object);
		user.markModified('books');
		user.save();
	});
}

function findBooks (callback) {
	User.findOne({username: bookUser}, function(err, user) {
		if (err) return console.log(err);
		mylist = user.books;
		callback();
	});
}


function findAll(callback) {
	User.find({}, books, function(err, users) {
		if (err) return console.log(err);
		users.forEach(function(user) {
			user.books.forEach(function(element) {
				allbooks.push(element);
			});
		});
		callback();
	});
}


function removeBook (title) {
	User.findOne({'books.title': title}, function (err, user) {
		if (err) return console.log(err);
	for (var i = 0; i<user.books.length; i++) {
		if (user.books[i].title===title) {
			user.books.splice(i,1);
			user.markModified('books');
			user.save();
			console.log(user);
		}
	}	
	});
}

function addTrade (title, person) {
	User.findOne({'books.title': title}, function(err, user) {
		if (err) return console.log(err);
		if (user.username !== person) {
		for (var i =0; i<user.books.length; i++) {
			if (user.books[i].title === title) {
				user.books[i].trades.push(person);
				user.markModified('books');
				user.save();
			}
		}
		message = 'Your trade request has been sent.';
		console.log(user);
		}
		else {
			message = "You cannot request your own book. Please select another title.";
		}
	});
}

function inRequests (person, callback) {
	User.findOne({username: person}, function(err, user) {
		if (err) return console.log(err);
		for (var i=0; i<user.books.length; i++) {
			if (user.books[i].trades.length>0) {
			incomingRequests.push(user.books[i]);
		}	
		}
		callback();
	});
}

function outRequests(person, callback) {
	User.find({'books.trades': person }, function (err, users) {
		if (err) return console.log(err);
		users.forEach(function(user) {
		for (var k=0; k<user.books.length; k++) {
			if (user.books[k].trades.indexOf(person)!==-1) {
				outgoingRequests.push(user.books[k]);
			}
		}
		});
		callback();
	});
}

function cancelTrade (title) {
	User.findOne({'books.title': title}, function(err, user) {
		if (err) return console.log(err);
		for (var i =0; i<user.books.length; i++) {
			if (user.books[i].title === title) {
				var position = user.books[i].trades.indexOf(bookUser);
				user.books[i].trades.splice(position, 1);
				user.markModified('books');
				user.save();
				console.log(user);
			}
		}
	});
}

function isLoggedIn (req, callback) {
		if (req.isAuthenticated()) {
			header = pug.renderFile(path.join(__dirname, '../../pug/loggedin.pug'));
			bookUser = req.user.username;
			console.log(bookUser);
		} else {
			header = pug.renderFile(path.join(__dirname, '../../pug/notloggedin.pug'));
		}
		callback();
	}

app.route('/')
	.get(function(req, res){
		isLoggedIn(req, function() {
			var main = pug.renderFile(path.join(__dirname, '../../pug/home.pug'));
		res.send(header + main);
		});
		
	});
	
app.route('/login')
	.get(function(req, res) {
		var login = pug.renderFile(path.join(__dirname, '../../pug/signin.pug'));
		res.send(login);
	})
	.post(passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/login', }));
	
app.route('/register')
	.get(function(req, res) {
		var register = pug.renderFile(path.join(__dirname, '../../pug/register.pug'));
		res.send(register);
	})
	.post(function(req,res) {
		var newUser = new User();
		newUser.username = req.body.username;
		newUser.email = req.body.email;
		newUser.password = req.body.password;
		newUser.save(function(err) {
        if (err) return (console.log(err));
        });
        res.redirect('/login');
	});
	
app.route('/account')
	.get(function(req, res) {
		var account = pug.renderFile(path.join(__dirname, '../../pug/account.pug'), {alert: ''});
		res.send(account);
	});
	
app.route('/location')	
	.post(function (req, res) {
		User.findOne({username: req.user.username}, function(err, user) {
			if (err) console.log(err);
			user.location.city = req.body.city;
			user.location.state = req.body.state; 
			user.save();
		});
		var newLocation = pug.renderFile(path.join(__dirname, '../../pug/account.pug'), {alert: '', location: "Your location has been updated."});
		res.send(newLocation);
	});
	
app.route('/password')
	.post(function(req,res) {
		if (req.body.newpassword !== req.body.confirmnewpassword) {
			var noMatch = pug.renderFile(path.join(__dirname, '../../pug/account.pug'), {alert: "Your passwords do not match."});
			res.send(noMatch);
		}
		else {
		User.findOne({username: req.user.username}, function(err, user) {
			if (err) console.log(err);
			if (req.body.oldpassword!== user.password) {
				var noMatch = pug.renderFile(path.join(__dirname, '../../pug/account.pug'), {alert: "Old password is incorrect."});
				res.send(noMatch);
			}
			else {
				user.password = req.body.newpassword;
				user.save();
				var match = pug.renderFile(path.join(__dirname, '../../pug/account.pug'), {alert: "Your password has been changed."});
				res.send(match);
			}
		});
		}
	});
	
app.route('/myBooks')
	.get(function(req,res) {
		findBooks(function() {
			var mine = pug.renderFile(path.join(__dirname, '../../pug/mybooks.pug'), {books: mylist});
			res.send(mine);	
		});
	});
	
app.route('/allBooks')
	.get(function(req, res) {
		findAll(function() {
			var library = pug.renderFile(path.join(__dirname, '../../pug/allbooks.pug'), {books: allbooks, alert: message});
			res.send(library);
			message = '';
			allbooks=[];
		});
	});
	
app.route('/trade/:title')
	.get(function(req,res) {
		var book = unescape(req.path.substr(7));
		var person = req.user.username;
		addTrade(book, person);
		res.redirect('/allBooks');
	});
	
app.route('/trades')
	.get(function(req,res) {
		inRequests(req.user.username, function() {
			outRequests(req.user.username, function() {
			var requests = pug.renderFile(path.join(__dirname, '../../pug/trades.pug'), {reqs: incomingRequests, myreqs: outgoingRequests });
			res.send(requests);	
			});
		});
		incomingRequests = [];
		outgoingRequests = [];
	});
	
app.route('/signOut')
	.get(function(req, res) {
		req.logOut();
		req.session.destroy();
		res.redirect('/');
	});
	
	
io.on('connection', function(socket){
		console.log('a user connected');
		socket.on('booksearch', function(book){
			bookSearch(book, function() {
				io.emit('booksearch', image, snippet, title);	
			});	
		});
		socket.on('removebook', function(title) {
			removeBook(title);
		});
		socket.on('cancelRequest', function(title) {
			cancelTrade(title);
		});
		socket.on('acceptTrade', function(requestor) {
			User.findOne({username: requestor}, function(err, user) {
				if (err) return console.log(err);
				var email = user.email;
				io.emit('acceptTrade', email);
			});	
		});
		socket.on('declineTrade', function(requestor, title) {
			User.findOne({username: bookUser}, function(err, user) {
				if (err) return console.log(err); 
				for (var i =0; i<user.books.length; i++) {
				if (user.books[i].title === title) {
				var position = user.books[i].trades.indexOf(requestor);
				user.books[i].trades.splice(position, 1);
				user.markModified('books');
				user.save();
			}
		}
			});	
		});
	});
	
};

