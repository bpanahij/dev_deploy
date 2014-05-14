var path = require('path')
  , fs = require('fs')

var root = path.resolve(__dirname + '/../../../../../')
  , branch = require(root + '/api/v1/deploy/actions/branch');

var test_directory = __dirname + '/.test';
var repo_directory = test_directory + '/repo';
describe('branch', function () {
  /**
   *
   */
  it("should clone master branch", function (done) {
    var rmdir = require('rimraf');
    rmdir(repo_directory, function (error) {
      fs.mkdir(repo_directory, function () {
        branch.clone(repo_directory, 'git@github.com:bpanahij/passportedu_schema.git')
          .then(function (msg) {
            expect('success').toEqual('success');
            done();
          })
          .fail(function (err) {
            expect('success').toEqual('failure');
            done();
          });
      });
    });
  }, 100000);
  /**
   *
   */
  it("should checkout master branch", function (done) {

    branch.checkout(repo_directory, 'master')
      .then(function (msg) {
        expect('success').toEqual('success');
        done();
      })
      .fail(function (err) {
        expect('success').toEqual('failure');
        done();
      });
  }, 100000);
  /**
   *
   */
  it("should fetch the latest repo commits", function (done) {
    branch.fetch(repo_directory)
      .then(function (msg) {
        console.log(msg);
        expect('success').toEqual('success');
        done();
      })
      .fail(function (err) {
        expect('success').toEqual('failure');
        done();
      });
  }, 100000);
});
