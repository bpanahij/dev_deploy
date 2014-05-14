/**
 * Module dependencies.
 */
var express = require('express'),
  http = require('http'),
  https = require('https'),
  path = require('path'),
  fs = require('fs'),
  mongoose = require('mongoose'),
  io = require('socket.io'),
  moment = require('moment');
// Mongoose
mongoose.connect('mongodb://localhost/dev_deploy');
/**
 * Express
 */
var app = express();
/**
 * Create the server
 */
var server = http.createServer(app);
/**
 * Add a Socket IO Listener
 */
io = io.listen(server);
/**
 * For other modules to hook in
 * @type {*|exports}
 */
module.exports = {
  io: io
};
/**
 * Static resources
 */
app.use(function (req, res, next) {
  res.setHeader('Expires', moment().add('days', 7).format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT')
  res.setHeader('Last-Modified', moment().subtract('seconds', 30).format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT')
  next();
});
var coreAssets = __dirname + '/client';
app.use(express.static(coreAssets));
/**
 * API
 */
var templates = require('./templates');
app.get('/templates*', templates);
/**
 * Hypermedia API
 */
app.use(function (req, res, next) {
  res.setHeader('Expires', moment().add('seconds', 1).format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT'); //'Fri, 30 Oct 2014 14:19:41 GMT')
  res.setHeader('Last-Modified', moment().subtract('seconds', 1).format("ddd, DD MMM YYYY HH:mm:ss") + ' GMT'); //'Fri, 30 Oct 1998 14:19:41 GMT')
  next();
});
var apiEndpoints = require('./api/v1');
app.use('/api/v1', apiEndpoints);
/**
 * API Endpoints
 */
app.use("/api/v1*", function (req, res) {
  res.json({no:'yes'});
});
/**
 * Start Server
 */
server.listen(8080, function () {
  console.log('Listening on port ' + 8080);
});
