/**
 *
 */
var  _ = require('underscore');

var root_dir = "/Users/bjohnson/repos/";
var deploy = {};
/**
 *
 */
deploy.tags = function(req, res) {
  var directory = req.params.directory
    , git = require('simple-git')(root_dir + directory);
  git.tags(function (err, msg) {
    if (err) {
      res.json({
        success: false,
        message: err
      });
    }
    res.json({
      success: true,
      message: msg
    });
  });
};
/**
 *
 */
deploy.checkoutBranch = function(req, res) {
  var directory = req.params.directory
    , branch = req.params.branch
    , commit = req.params.commit
    , git = require('simple-git')(root_dir + directory);
  git.checkoutBranch(branch, commit, function (err, msg) {
    if (err) {
      res.json({
        success: false,
        message: err
      });
    }
    res.json({
      success: true,
      message: msg
    });
  });
};
/**
 *
 */
deploy.clone = function(req, res) {
  var repo = req.body.repo
    , directory = req.params.directory
    , git = require('simple-git')(root_dir + directory);
  git.clone(repo, function (err, msg) {
    if (err) {
      res.json({
        success: false,
        message: err
      });
    }
    res.json({
      success: true,
      message: msg
    });
  });
};
/**
 *
 */
deploy.checkout = function(req, res) {
  var commit = req.params.commit
    , directory = req.params.directory
    , git = require('simple-git')(root_dir + directory);
  git.checkout(commit, function (err, msg) {
    if (err) {
      res.json({
        success: false,
        message: err
      });
    }
    res.json({
      success: true,
      message: msg
    });
  });
};
/**
 *
 */
deploy.clean = function(req, res) {
  var directory = req.params.directory
    , git = require('simple-git')(root_dir + directory);
  git.clean(function (err, msg) {
    if (err) {
      res.json({
        success: false,
        message: err
      });
    }
    res.json({
      success: true,
      message: msg
    });
  });
};
/**
 *
 */
deploy.reset = function(req, res) {
  var commit = req.params.commit
    , directory = req.params.directory
    , git = require('simple-git')(root_dir + directory);
  git.reset(commit, function (err, msg) {
    if (err) {
      res.json({
        success: false,
        message: err
      });
    }
    res.json({
      success: true,
      message: msg
    });
  });
};
/**
 *
 */
module.exports = deploy;
