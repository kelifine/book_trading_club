'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
	username: String,
	email: String,
	password: String,
	location: {
		city: String,
		state: String
	},
	books: Array
});
User.methods.validPassword = function(pwd) {
	if (pwd === this.password) return true;
	else return false;
};


module.exports = mongoose.model('User', User);
