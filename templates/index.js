var express = require('express')
  , api = express()
  , path = require('path')
  , fs = require('fs')
  , _ = require('underscore');
/**
 *
 * @param startPath
 * @param remaining
 * @param callback
 */
function loadVariPath(startPath, remaining, bestFile, callback) {
  fs.readdir(startPath, function(err, files) {
    for(i in files) {
      if (files[i].match(/{{.*}}/)) {
        var match = files[i].match(/{{(.*)}}/)[1];
        loadPath(path.join(startPath, files[i]), remaining, bestFile, callback);
        return;
      }
    }
    loadPath(startPath, remaining, bestFile, callback);
  });
}
/**
 *
 * @param startPath
 * @param remaining
 * @param callback
 */
function loadPath(startPath, remaining, bestFile, callback) {
  if (remaining.length == 0) {
    fs.exists(startPath + '/index.html', function(exists) {
      if (exists) {
        bestFile = startPath + '/index.html';
        fs.readFile(bestFile, function(err, data) {
          callback(data);
        });
      } else {
        fs.exists(startPath + '.html', function(exists) {
          if (exists) {
            bestFile = startPath + '.html';
          }
          fs.readFile(bestFile, function(err, data) {
            callback(data);
          });
        });
      }
    });
    return;
  }
  var test_path = path.join(startPath, remaining.shift());
  fs.exists(test_path, function(exists) {
    if (exists) {
      fs.exists(test_path + '/index.html', function(exists) {
        if (exists) {
          bestFile = test_path + '/index.html';
          loadPath(test_path, remaining, bestFile, callback);
        } else {
          fs.exists(test_path + '.html', function(exists) {
            if (exists) {
              bestFile = test_path + '.html';
            }
            loadPath(test_path, remaining, bestFile, callback);
          });
        }
      });
    } else {
      fs.exists(test_path + '.html', function(exists) {
        if (exists) {
          bestFile = test_path + '.html';
          loadPath(test_path, remaining, bestFile, callback);
        } else {
          loadVariPath(startPath, remaining, bestFile, callback);
        }
      });
    }
  });
}
module.exports = function(req, res) {
  var optionPath = req.originalUrl.replace('templates/', '').replace('.html', '').replace(/\?.*$/, '').split('/');
  optionPath = _.filter(optionPath, function(val) {
    return val !== "";
  });
  var bestFile = '/index.html';
  loadPath(__dirname, optionPath, bestFile, function(options) {
    res.set('Content-Type', 'text/html');
    res.header("Access-Control-Allow-Origin", "*");
    res.send(options);
  });
};