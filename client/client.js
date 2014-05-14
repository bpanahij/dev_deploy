/**
 * Client for UI, domain specific controllers, services, filters, etc...
 */
angular.module('client', [
  'schemaCrawler',
  'dragAndDrop'
])
  .filter('fieldName', [
    function () {
      'use strict';
      /**
       * Change the field to a string without spaces
       */
      return function (input) {
        return input.replace(/[^a-zA-Z0-9]/g, '_');
      };
    }
  ])
  .filter('filterPageEdges', [
    function () {
      'use strict';
      /**
       * Special filter for pages
       */
      return function (items, options) {
        var filtered = []
          , middle = Math.floor(items.length / 2) - 1
          , halfPages = (options.pagesToShow / 2);
        angular.forEach(items, function (item, index) {
          if (index < 2 || index > (items.length - 3) ||
            (index > (middle - halfPages) && index < (middle + halfPages))) {
            filtered.push(item);
          }
        });
        return filtered;
      };
    }
  ])
  .controller('ClientArea', [
    '$rootScope',
    '$window',
    '$resource',
    '$location',
    '$filter',
    '$scope',
    'jsonSchema',
    'jsonClient',
    '$q',
    function ($rootScope, $window, $resource, $location, $filter, $scope, JsonSchema, jsonClient, $q) {
      'use strict';
      /**
       * The API Client
       */
      $rootScope.client = jsonClient();
      $scope.$watch(function () {
        return $location.search();
      }, function () {
        $scope.query = $location.search();
      });
      /**
       * Watch for page re-sizes and save page size
       */
      $scope.pagesToShow = Math.floor($window.innerWidth / 90);
      $window.onresize = function () {
        $scope.$apply(function () {
          $scope.pagesToShow = Math.floor($window.innerWidth / 90);
        });
      };
      /**
       * Watch for changes to the schema, i.e. on api endpoint changes
       */
      $scope.$watch('client.schema', function () {
        if (angular.isUndefined($scope.client.schema)) {
          return;
        }
        var pathParts = $scope.client.schema.id.replace(/\//, '').split('/');
        while (pathParts.length > 0) {
          var crumb = pathParts.join('/')
            , rel = pathParts.pop()
            , title = rel;
          if (rel === 'api' || rel === 'v1') {
            return;
          }
          var foundLink = $scope.client.links.filter(function (link) {
            return link._link.href === '/' + crumb && (link._link.method === 'GET' ||
              angular.isUndefined(link._link.method));
          });
          // Looking for another link with this href/method and using that title if it's set
          if (foundLink.length) {
            title = foundLink[0]._link.title;
          }
          else {
            if (rel.length === 24) {
              title = pathParts[pathParts.length - 1];
              title = title.substr(0, title.length - 1);
            }
          }
          $scope.client.links.unshift({
            _link: {
              title: title,
              href: crumb,
              importance: 'crumb',
              rel: 'crumb_' + rel
            }
          });
        }
      });
      /**
       * Traverse a link to a new URL, given the rel and the link params/data
       */
      $scope.traverse = function () {
        var deferred = $q.defer();
        $rootScope.client.traverse(this.link._link.rel, this.link).then(function (err, resp) {
          deferred.resolve(resp);
        });
        return deferred.promise;
      };
      /**
       * Perform a link traversal directly on a link object, with embedded _link property
       */
      $scope.performLink = function (link) {
        $rootScope.client.link(link, link).then(function () {
        }, function (err) {
          console.log(err);
        });
      };
      /**
       * Perform the link action on the Draggable
       * @param drag
       */
      $scope.performDragLinkAction = function (drag) {
        $scope.client.traverse(drag._link.rel, drag);
      };
      /**
       * Perform the link action on the Drop Area
       * @param drag
       * @param drop
       */
      $scope.performDropLinkAction = function (drag, drop) {
        $rootScope.client.traverse(drag._link.rel, {
          drag: drag,
          drop: drop
        });
      };
      /**
       * When hovering over drop with draggable
       * @param drag
       * @param drop
       */
      $scope.enterDrop = function (drag, drop) {
        drop._dropOver = true;
      };
      /**
       * When leaving hover over drop with draggable
       * @param drag
       * @param drop
       */
      $scope.leaveDrop = function (drag, drop) {
        drop._dropOver = false;
      };
      /**
       * Get the Schema Client
       */
      var startURL = $location.url() ? $location.url() : '/api/v1';
      new JsonSchema(startURL).then(function (client) {
        console.log(client);
      });
    }
  ])
  .controller('AnonApplication', [
    '$rootScope',
    '$scope',
    '$filter',
    'base64',
    function ($rootScope, $scope, $filter, base64) {
      'use strict';
      /**
       * The Anonymous Application Controller
       */
      $scope.cards = [];
      $scope.student = {};
      $scope.submitRegisterApp = function () {
        var cards = $filter('semantics')($rootScope.client.links, {
          importance: 'cards'
        });
        var authHeader = base64.encode($scope.student.username + ':' + $scope.student.password);
        $scope.client.setHeader('Authorization', authHeader);
        $scope.client.setHeader('Token', null);
        $scope.client.traverse('register', {
          student: $scope.student,
          cards: cards
        });
      };
    }
  ])
  .factory('socket', [
    '$rootScope',
    function ($rootScope) {
      'use strict';
      /**
       * Socket.io client side service
       */
      var socket = window.io.connect('/', {
        secure: true
      });
      return {
        on: function (eventName, callback) {
          socket.on(eventName, function () {
            var args = arguments;
            $rootScope.$apply(function () {
              callback.apply(socket, args);
            });
          });
        },
        emit: function (eventName, data, callback) {
          socket.emit(eventName, data, function () {
            var args = arguments;
            $rootScope.$apply(function () {
              if (callback) {
                callback.apply(socket, args);
              }
            });
          });
        }
      };
    }
  ])
  .directive('autoSaveCard', [
    'debounce',
    function (debounce) {
      'use strict';
      /**
       * An directive that will traverse a link when and ng-models within it change
       */
      return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attrs, ngModel) {
          var saveIt = debounce(function () {
            var link = ngModel.$viewValue;
            scope.client.traverse(link._link.rel, link).then(function (resp) {
              console.log(resp);
            });
          }, 100);
          element.bind('keyup change image', function () {
            saveIt();
          });
        }
      };
    }
  ])
  .directive('fileread', [
    'socket',
    function (socket) {
      'use strict';
      /**
       * An http/socket based file upload
       */
      return {
        scope: {
          fileread: '=',
          progress: '='
        },
        link: function (scope, element) {
          socket.on('progress:change', function (data) {
            scope.progress = Math.ceil(100 * data.loaded / data.total);
          });
          element.bind('change', function (changeEvent) {
            var reader = new FileReader();
            reader.onload = function (loadEvent) {
              scope.$apply(function () {
                scope.fileread = loadEvent.target.result;
              });
            };
            reader.readAsDataURL(changeEvent.target.files[0]);
          });
        }
      };
    }
  ])
  .directive('captureSave', [
    function () {
      'use strict';
      /**
       * Capture the Save keyboard shortcut and show a save tooltip
       */
      return {
        restrict: 'A',
        link: function () {
          var listener = new window.keypress.Listener();
          listener.simple_combo("meta s", function (e) {
            $(".navbar").popover('show');
            e.preventDefault();
          });
        }
      };
    }
  ])
  .directive('signedUrl', ['$rootScope', '$http',
    function ($rootScope, $http) {
      'use strict';
      return {
        scope: {
          signedUrl: '@'
        },
        restrict: 'A',
        link: function (scope, element, attrs) {
          if (angular.isUndefined(attrs.signedUrl) || !attrs.signedUrl) {
            return;
          }
          var userId = $rootScope.client.data.studentId || $rootScope.client.data.admissionsId
            , userType = $rootScope.client.data.studentId ? 'students' : 'admissions';
          $http.get('/api/v1/' + userType + '/' + userId + '/signedurl', {
            headers: {
              Token: $rootScope.client.staticHeaders.Token
            },
            params: {
              s3Path: attrs.signedUrl
            },
            method: 'GET'
          }).then(function (response) {
            scope.signedURL = response.data.signedURL;
          });
        },
        template: '<img width="100%" ng-src="{{signedURL}}">'
      }
    }
  ])
  .run([
    '$rootScope',
    function ($rootScope) {
      'use strict';
      /**
       * Run Intercom Analytics in an interval
       */
      setInterval(function () {
        var client = $rootScope.client;
        if (angular.isDefined(window.Intercom)
          && angular.isDefined(client)
          && angular.isDefined(client.responseHeaders)
          && angular.isDefined(client.responseHeaders['x-intercom-email'])) {
          var update = {
            'email': client.responseHeaders['x-intercom-email'],
            'name': client.responseHeaders['x-intercom-full-name'],
            'user_id': client.responseHeaders['x-intercom-user-id'],
            'created_at': client.responseHeaders['x-intercom-created-at'],
            'user_hash': client.responseHeaders['x-intercom-user-hash'],
            'app_id': client.responseHeaders['x-intercom-api'],
            'increments': {
              'time': 1
            }
          };
          if (angular.isDefined(client.responseHeaders['x-intercom-custom'])) {
            angular.extend(update, JSON.parse(client.responseHeaders['x-intercom-custom']));
          }
          if (angular.isDefined(window.Intercom.isInitialized)) {
            window.Intercom('update', update);
          }
          else {
            window.Intercom('boot', update);
          }
        }
      }, 5000);
    }]);
