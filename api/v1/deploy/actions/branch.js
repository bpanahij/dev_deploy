var q = require('q');
/**
 *
 * @param directory
 * @param commit
 * @returns {promise|Q.promise}
 */
var checkout = function (directory, commit) {
  var deferred = q.defer();
  var git = require('simple-git')(directory);
  git.checkout(commit, function (err, msg) {
    if (err) {
      deferred.reject(err);
      return;
    }
    deferred.resolve(msg);
  });
  return deferred.promise;
};
/**
 *
 * @param directory
 * @param repo
 * @returns {promise|Q.promise}
 */
var clone = function (directory, repo) {
  var deferred = q.defer();
  var git = require('simple-git')(directory);
  git.clone(repo, directory, function (err, msg) {
    if (err) {
      deferred.reject(err);
      return;
    }
    deferred.resolve(msg);
  });
  return deferred.promise;
};
/**
 *
 * @param directory
 * @returns {*}
 */
var fetch = function (directory) {
  var deferred = q.defer();
  var git = require('simple-git')(directory);
  git.fetch(function (err, msg) {
    if (err) {
      deferred.reject(err);
      return;
    }
    deferred.resolve(msg);
  });
  return deferred.promise;
};

/**
 *
 * @type {{checkout: checkout}}
 */
module.exports = {
  checkout: checkout,
  clone: clone,
  fetch: fetch
};
