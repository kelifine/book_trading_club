'use strict';

var express = require('express');
var routes = require('./app/routes/index.js');
var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');

var app = express();
require('./app/config/passport')(passport);
var http = require('http').Server(app);
var io = require('socket.io')(http);


mongoose.connect(process.env.MONGOLAB_URI);
mongoose.Promise = global.Promise;

app.use('/controllers', express.static(process.cwd() + '/app/controllers'));
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/common', express.static(process.cwd() + '/app/common'));

app.use(session({ secret: 'btc', resave: true, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());

var routes = require('./app/routes/index.js')(io, app, passport);


var port = process.env.PORT || 8080;
http.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});
io = io.listen(http);
