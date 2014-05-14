angular.module('schemaCrawler', [
  'ngResource',
  'clientUtilities'
])
  .config([
    '$httpProvider',
    function ($httpProvider) {
      /**
       * Intercepting responses
       */
      var interceptor = [
        '$window',
        '$location',
        '$q',
        'jsonClient',
        'base64',
        function ($window, $location, $q, jsonClient, base64) {
          /**
           * Helping to interpret response headers, and build static request headers, as well as API session token
           */
          var useHeaders = function (response) {
            var client = jsonClient();
            var headers = response.headers();
            if (angular.isDefined(headers['x-username']) && angular.isDefined(headers['x-token'])) {
              var token = base64.encode(headers['x-username'] + ':' + headers['x-token']);
              client.setHeader('Authorization', null);
              client.setHeader('Token', token);
              sessionStorage.token = token;
            }
          };
          /**
           * Helping handle successful (200) responses
           */
          var success = function (response) {
            useHeaders(response);
            return response;
          };
          /**
           * Helping handle other responses: 300, etc...
           */
          var other = function (response) {
            var url = response.headers().location;
            if (response.status == 300) {
              useHeaders(response);
              jsonClient().buildClient(url).then(function (client) {
                client.url = url;
                $location.path(url);
              });
            }
            return $q.reject(response);
          };
          /**
           * Interceptor returning a function that accepts a promise,
           * and returns a callback to the success and other methods
           */
          return function (promise) {
            return promise.then(success, other);
          }
        }];
      $httpProvider.responseInterceptors.push(interceptor);
    }])
/**
 * The Schema crawler logic, parsing out links, and interpolating data into them
 */
  .factory('jsonSchema', [
    '$rootScope',
    '$resource',
    '$interpolate',
    '$q',
    '$window',
    '$http',
    '$location',
    'jsonClient',
    'base64',
    function ($rootScope, $resource, $interpolate, $q, $window, $http, $location, jsonClient, base64) {
      var apiClient = jsonClient();
      apiClient.username = 'guest';
      /**
       * Saving response headers
       */
      apiClient.responseHeaders = {};
      /**
       * Static Headers that will be reused on each request
       */
      apiClient.staticHeaders = {};
      /**
       * Setting headers for authentication
       */
      apiClient.setCredentials = function (username, token) {
        apiClient.setHeader('Authorization', null);
        apiClient.setHeader('Token', base64.encode(username + ':' + token));
      };
      /**
       * Setting a static header, which will be reused on all future HTTP requests
       * Good for saving Authentication headers
       */
      apiClient.setHeader = function (headerName, headerValue) {
        apiClient.staticHeaders[headerName] = headerValue;
      };
      /**
       * Interpolate data across entire schema: useful for dynamic titles, and non link dynamism
       */
      apiClient.interpolateWholeSchema = function (schema, data) {
        var flatSchema = JSON.stringify(schema)
          , flatSchemaInterpolator = $interpolate(flatSchema);
        flatSchema = flatSchemaInterpolator(data);
        apiClient.schema = JSON.parse(flatSchema);
      };
      /**
       * Finding the link object identified by the rel from an array of link objects
       */
      apiClient.findRelLink = function (rel, links) {
        var deferred = $q.defer();
        angular.forEach(links, function (link) {
          if (link._link.rel === rel) {
            deferred.resolve(link);
          }
        });
        return deferred.promise;
      }
      /**
       * Traversing schemas/sub-schemas to find links
       * keeping track of the path, and then compile and interpolate any links found
       *
       * root is a continued reference to the root schema
       * schema is the local schema at each level of recursion
       * pathParts starts empty, and then is recursively appended with the path as this
       * method re-curse through the schema properties
       */
      apiClient.resolveEmbeddedLinks = function (root, schema, pathParts) {
        if (angular.isUndefined(pathParts)) {
          // Initialize a persistent path reference
          pathParts = [];
        }
        // Looking for "links" property on schema
        if (angular.isDefined(schema.links)) {
          // Go through links
          for (var link in schema.links) {
            // Copy the path and the data, and create a fresh data
            var pathPartsCopy = angular.copy(pathParts)
              , rootDataCopy = angular.copy(root.data)
              , data = {};
            // Compile the data and link together:
            // this is the final pathway for this method, where the link is generated
            apiClient.compileLink(root, rootDataCopy, data, pathPartsCopy, schema.links[link]);
          }
        }
        // If there are sub-properties of this schema level, then check each property
        if (angular.isDefined(schema.properties)) {
          // Look at each property
          for (var property in schema.properties) {
            var propPath = angular.copy(pathParts); // generating a fresh de-referenced path
            propPath.push(property); // compile the path as we go
            apiClient.resolveEmbeddedLinks(root, schema.properties[property], propPath); // re-curse again into the method
          }
        }
        // Array items need to be checked for links as well
        if (angular.isDefined(schema.items)) {
          var arrayPath = angular.copy(pathParts); // add array property name to path
          apiClient.resolveEmbeddedLinks(root, schema.items, arrayPath);
        }
      };
      /**
       * Compiling a link by combining a link object with it's correlated data
       */
      apiClient.compileLink = function (root, fullPathData, data, pathParts, link) {
        // When all of the path sections have been popped off the array,
        // then interpolate the link
        if (pathParts.length === 0) {
          // Copy the link to dereference it
          var eLink = angular.copy(link) // Dereference the link
            , flatLink = JSON.stringify(eLink) // Flatten the link in prep for interpolation of all of it's properties and values
            , flatLinkInterpolater = $interpolate(flatLink); // create the interpolator instance
          flatLink = flatLinkInterpolater(fullPathData); // interpolate the entirety of found data into the link
          var interpolatedLink = {};
          interpolatedLink._link = JSON.parse(flatLink);
          angular.extend(interpolatedLink, data);
          if (!angular.isArray(root.links)) {
            root.links = []; // Handle the case where the schema root links array is not present
          }
          // Add this interpolated link
          root.links.push(interpolatedLink);
          return;
        }
        var seg = pathParts.shift() // Shift off the beginning of the path
          , fullPathDataSeg = fullPathData[seg]
          , d
          , fullPathDataCopy;
        if (angular.isArray(fullPathDataSeg)) {  //If path points to an array,
          // Loop over all the elements
          for (var n in fullPathDataSeg) {
            var aLink = angular.copy(link);
            // Dereference the data and the link
            d = angular.copy(fullPathDataSeg[n]);
            fullPathDataCopy = angular.copy(fullPathData);
            // Flatten/aggregate all the data at a single level deep literal
            angular.extend(fullPathDataCopy, d);
            // Re-curse into the array item, in case it is an object,
            // it may have properties to re-curse into
            apiClient.compileLink(root, fullPathDataCopy, d, angular.copy(pathParts), aLink);
          }
        }
        // Otherwise if the path points to an object, then
        if (!angular.isArray(fullPathDataSeg) && angular.isObject(fullPathDataSeg)) {
          /// Dereference the data and the link
          var lLink = angular.copy(link);
          d = angular.copy(fullPathDataSeg);
          fullPathDataCopy = angular.copy(fullPathData);
          // Flatten/aggregate all the data at a single level deep literal
          angular.extend(fullPathDataCopy, fullPathDataSeg);
          // Recurse into object in case it has sub-properties
          apiClient.compileLink(root, fullPathDataCopy, d, angular.copy(pathParts), lLink);
        }
      };
      /**
       * Using the OPTIONS method on a URL to find schema
       */
      apiClient.resolveSchema = function (url) {
        var deferred = $q.defer();
        // Make an OPTIONS request
        $http({method: 'OPTIONS', url: url}).success(function (schema, status, headers, config) {
          // resolve the schema: the headers and status are generally irrelevant here
          deferred.resolve(schema);
        }).error(function (data, status, headers, config) {
          console.error(data, status, headers);
        });
        return deferred.promise;
      };
      /**
       * Building the client App:
       * Main method of this Service,
       * Crawling schema to build a dynamic client, conforming to schema descriptors
       * NOTE: This method does not need a schema to traverse a link, it uses a url
       */
      apiClient.buildClient = function (url) {
        var def = $q.defer();
        // Start with empty data
        apiClient.data = {};
        // Retrieve the authorization token from session storage
        apiClient.setHeader('Token', sessionStorage.token);
        apiClient.resourceURLTraverse(url, {}, {'GET': {method: 'GET', headers: apiClient.staticHeaders}}, 'GET', {})
          .then(function (data) {
            // get the schema for this URL
            apiClient.resolveSchema(url).then(function (schema) {
              // Add the schema to the client, and make a copy of it for safe keeping
              apiClient.schema = schema;
              apiClient.origSchema = angular.copy(schema); // This copy will be used for refresh
              apiClient.links = angular.copy(schema.links);
              apiClient.data = data;
              apiClient.links = [];
              apiClient.resolveEmbeddedLinks(apiClient, apiClient.schema);
              apiClient.interpolateWholeSchema(apiClient.schema, data);
              def.resolve(apiClient);
            });
          });
        return def.promise;
      };
      /**
       * Traversing to the Schema of the given rel link
       */
      apiClient.traverse = function (rel, params) {
        var deferred = $q.defer();
        // Find the link in the interpolated link array
        apiClient.findRelLink(rel, apiClient.links).then(function (link) {
          /**
           * Mixpanel integration
           */
          mixpanel.track(link._link.title, {
            data: link.data,
            username: apiClient.username
          });
          // follow the link, with the new data
          apiClient.link(link, params).then(function (data) {
            // Replace the client data with the new data
            // Just send the request and then ignore the data and don't get the options
            if (link._link.target === 'nofollow') {
              deferred.resolve(apiClient);
              return;
            }
            apiClient.data = data;
            // Just re-interpolate the new data into the original schema
            if (link._link.target === 'refresh') {
              apiClient.links = [];
              apiClient.resolveEmbeddedLinks(apiClient, angular.copy(apiClient.origSchema));
              apiClient.interpolateWholeSchema(angular.copy(apiClient.origSchema), data);
              deferred.resolve(apiClient);
              return;
            }
            // Default behavior, get the OPTIONS
            apiClient.resolveSchema(link._link.href).then(function (schema) {
              apiClient.schema = schema;
              apiClient.origSchema = angular.copy(schema);
              apiClient.links = [];
              apiClient.resolveEmbeddedLinks(apiClient, angular.copy(apiClient.origSchema));
              apiClient.interpolateWholeSchema(angular.copy(apiClient.origSchema), data);
              deferred.resolve(apiClient);
            }, function (err) {
              console.log('resolve schema error', err);
            });
          }, function (err) {
            console.log('link error', err);
          });
        }, function (err) {
          console.log('find rel err', err);
        });
        return deferred.promise;
      };
      /**
       * Performing an HTTP METHOD to a given link using params for interpolation,
       * but not updating the schema (as traverse does)
       */
      apiClient.link = function (link, params, addHeaders) {
        var deferred = $q.defer();
        // Dereference link
        var eLink = angular.copy(link);
        // determining the method: GET is default
        var method = eLink._link.method ? eLink._link.method : 'GET'
          , methods = {}
          , defaults = {}
        // JSON Hyper schema always defaults toi application/json content type
          , headers = {
            'Content-Type': 'application/json'
          };
        // Validate against link schema
        var payload = {};
        // Preventing properties not in schema from being POST/PUT
        angular.forEach(eLink._link.properties, function (propertyConfig, propertyName) {
          if (angular.isUndefined(params[propertyName])) {
            return;
          }
          payload[propertyName] = params[propertyName];
        });
        // compiling all headers
        angular.extend(headers, apiClient.staticHeaders, addHeaders);
        // defining endpoint with method and headers
        methods[method] = {
          method: method,
          headers: headers
        };
        // Using default values when the property is still undefined
        angular.forEach(eLink._link.properties, function (config, prop) {
          defaults[prop] = angular.isDefined(config.default) ? config.default : null;
        });
        // Now doing the link traversal
        apiClient.resourceURLTraverse(eLink._link.href, defaults, methods, method, payload, eLink._link.target, eLink._link.mime)
          .then(function (response) {
            deferred.resolve(response);
          }, function (err) {
            console.log('resource url traverse error', err);
          });
        return deferred.promise;
      }
      /**
       * Using the angular $resource service to perform a link traversal
       */
      apiClient.resourceURLTraverse = function (url, defaults, methods, method, payload, target, mime) {
        var deferred = $q.defer();
        if (target === "data") {
          // When the schema specifying data target, then use the http method, and do not try to load a schema
          $http({method: methods[method].method, headers: methods[method].headers, url: url})
            .success(function (data) {
              var encoded_data = base64.encode(data);
              window.location.href = "data:" + mime + encoded_data;
            });
        }
        // External links should be traversed by replacing the entire url
        else if (target === 'external') {
          $window.location.href = url;
          deferred.reject({});
        } // New links should be opened in a new window
        else if (target === 'new') {
          window.open('#' + url);
          deferred.reject({});
        } else {
          // All other links are traversed in this window
          var resource = $resource(url, defaults, methods);
          resource[method](payload, function (response, headersFunc) {
            var headers = headersFunc();
            if (angular.isDefined(headers['x-username']) && angular.isDefined(headers['x-token'])) {
              // Clear the Auth header, to prevent sending password anymore
              apiClient.setHeader('Authorization', null);
              var token = base64.encode(headers['x-username'] + ':' + headers['x-token']);
              apiClient.setHeader('Token', token); // Set the Auth Token
              sessionStorage.token = token; // Save the Token
            }
            apiClient.responseHeaders = headers; // Save the headers
            // Don't change the url for refresh and nofollow links
            if (target !== 'nofollow') {
              $location.url(url);
              apiClient.url = url;
            }
            if (Object.keys(payload).length > 0) {
              $location.search(payload);
            }
            $rootScope.actualLocation = $location.path();
            deferred.resolve(response);
          }, function (httpResponse) {
            console.log(httpResponse);
          });
        }
        return deferred.promise;
      };
      return apiClient.buildClient;
    }])
/**
 * Filtering links on semantic values contained in the _link
 */
  .filter('semantics', [
    function () {
      return function (links, semantics) {
        var filtered = [];
        angular.forEach(links, function (link) {
          angular.forEach(semantics, function (value, key) {
            if (angular.isDefined(link._link) && link._link[key] == value) {
              filtered.push(link);
            }
          });
        });
        return filtered;
      };
    }])
/**
 * Ordering links on object values contained in the _link
 */
  .filter('orderObjectBy', [
    function () {
      return function (items, field, reverse) {
        var filtered = [];
        angular.forEach(items, function (item) {
          filtered.push(item);
        });
        filtered.sort(function (a, b) {
          return (a[field] > b[field]);
        });
        if (reverse) {
          filtered.reverse();
        }
        return filtered;
      };
    }])
/**
 * Filtering links on object values contained in the _link
 */
  .filter('filterObjectBy', [
    function () {
      return function (items, filter) {
        var filtered = {};
        angular.forEach(items, function (item, key) {
          var pass = true;
          angular.forEach(filter, function (fVal, fKey) {
            if (item[fKey] != fVal) {
              pass = false;
            }
          });
          if (pass) {
            filtered[key] = item;
          }
        });
        return filtered;
      };
    }])
/**
 * Singleton client container service
 */
  .factory('jsonClient', [
    function () {
      var apiClient = {};
      return function () {
        return apiClient;
      }
    }])
/**
 * Prevent too many requests
 */
  .factory('debounce', [
    '$timeout',
    function ($timeout) {
      /**
       * calling fn once after timeout no matter how many calls made, within timeout
       */
      return function (fn, timeout, apply) {
        timeout = angular.isUndefined(timeout) ? 0 : timeout;
        apply = angular.isUndefined(apply) ? true : apply;
        var nthCall = 0;
        return function () { // intercepting fn
          var that = this;
          var argz = arguments;
          nthCall++;
          var later = (function (version) {
            return function () {
              if (version === nthCall) {
                return fn.apply(that, argz);
              }
            };
          })(nthCall);
          return $timeout(later, timeout, apply);
        };
      }
    }])
/**
 *
 */
  .run([
    '$rootScope',
    '$location',
    'jsonClient',
    function ($rootScope, $location, jsonClient) {
      /**
       * Watching location changes for a back button, to handle that
       */
      $rootScope.$on('$locationChangeSuccess', function () {
        $rootScope.actualLocation = $location.path();
      });
      $rootScope.$watch(function () {
        return $location.path();
      }, function (newLocation, oldLocation) {
        // This means the back button was used
        if ($rootScope.actualLocation !== newLocation
          || oldLocation.replace(/\/$/, '') !== newLocation.replace(/\/$/, '')) {
          //  when the back button is used, then rebuild jsonClient
          jsonClient().buildClient($location.url());
        }
      });
    }]);
