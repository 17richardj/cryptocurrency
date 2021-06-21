//****************************************************************************************************************************
//@version - v1.0.0
//@auth Joshua Richard
//@file app.js
//@descr NODE.JS/EXPRESS web server implementation of client side to oodle network connection
//@Copyright (C) joshua Richard, 2019-2020. All rights reserved.
//****************************************************************************************************************************



var http = require('http');
var express = require('express');
var rateLimit = require('express-rate-limit');
const helmet = require('helmet');
var xss = require('xss-clean');
var ejs = require('ejs');
var path = require('path');
var app = express();
const chalk = require('chalk');
var net = require('net');
var stream = require('stream');
const socket = require("socket.io");

// listen on port 3000
const PORT = process.env.PORT || 3000;

const server = app.listen( PORT , function () {
  console.log(chalk.green('Express app listening on port: ' + PORT));
});

const io = require('socket.io')(server);

//app.use(helmet.noCache());
// Data Sanitization against XSS

//rate limits defined for given user to  elimate spamming
const limit = rateLimit({
    max: 1000,// max requests
    windowMs: 60 * 60 * 1000, // 1 Hour
    message: 'Too many requests' // message to send
});
app.use('/', limit); // Setting limiter on specific route

app.use(express.json({ limit: '10kb' })); // Body limit is 10

app.use(xss());

var bodyParser = require('body-parser');
const passport = require('passport');
var session = require('express-session');
const winston = require('winston');

var bcrypt = require('bcrypt');
const saltRounds = 10;

require("dotenv").config();

//establish session, session secret, manage cookies in secure manner
app.use(session({
  secret: ['Sakfewfnawiopeiffpawo=','HJznwaefawepofiawefalaz=','YRzkjakljlskdfKLJkjlfSNFS='],
    name: "secretname",
  resave: true,
  cookie: {
      httpOnly: true,
      //secure: true,
      sameSite: true,
      maxAge: 600000 // Time is in miliseconds
  },
  saveUninitialized: false,
  ///store: new MongoStore({
    //mongooseConnection: db,
    //ttl: (1 * 60 * 60)
  //})
}));

// passport middleware setup ( it is mandatory to put it after session middleware setup)
app.use(passport.initialize());
app.use(passport.session());

//use embedded javascript as view engine
app.set('views', path.join(__dirname, '../public/views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(express.static(__dirname + 'images'));

var index = require('../routes/index');
app.use('/', index);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('File Not Found');
  err.status = 404;
  next(err);
});

// error handler
// define as the last app.use callback
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send(err.message);
});

//set server timeout
setTimeout(function(){
  server.close();
},5000000);
