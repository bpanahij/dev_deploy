/**
 *
 */
var express = require('express')
  , api = express();
/**
 *
 */
var options = require('../../options');
api.options('/*', options);
/**
 *
 */
api.get('/get', function(req, res) {
  res.json({node: true});
});
var deploy = require('./deploy');
api.get('/dir/:directory/tags', deploy.tags);
api.get('/dir/:directory/clone', deploy.clone);
api.get('/dir/:directory/branch/:commit', deploy.checkout);
api.get('/dir/:directory/branch/:branch/commit/:commit', deploy.checkoutBranch);
api.get('/dir/:directory/clean', deploy.clean);
api.get('/dir/:directory/reset/:commit', deploy.reset);
  /**
 *
 */
module.exports = api;
