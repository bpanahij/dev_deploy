angular.module('MagicLink', [])
  .config(function() {
  })
  .directive('magicLink', function() {
    var link = function(scope, element, attrs) {

    };
    return {
      restrict: 'AE',
      replace: true,
      transclude: true,
      scope: {
        link: '=',
        click: '='
      },
      link: link,
      templateUrl: '/app/templates/magicLink.html'
    }
  })
  .directive('magicLinkModal', function() {
    var link = function(scope, element, attrs) {

    };
    return {
      restrict: 'AE',
      replace: true,
      transclude: true,
      scope: {
        link: '=',
        click: '='
      },
      link: link,
      templateUrl: '/app/templates/magicLinkModal.html'
    }
  })
  .directive('magicFormLink', function() {
    var link = function(scope, element, attrs) {

    };
    return {
      restrict: 'AE',
      replace: true,
      transclude: true,
      scope: {
        link: '=',
        click: '='
      },
      link: link,
      templateUrl: '/app/templates/magicFormLink.html'
    }
  })
  .directive('magicFormContent', function() {
    var link = function(scope, element, attrs) {

    };
    return {
      restrict: 'AE',
      replace: true,
      transclude: true,
      scope: {
        link: '=',
        click: '='
      },
      link: link,
      templateUrl: '/app/templates/magicFormContent.html'
    }
  })
  .directive('dropDownNav', function() {
    var link = function(scope, element, attrs) {

    };
    return {
      restrict: 'AE',
      replace: true,
      transclude: true,
      scope: {
        links: '=',
        click: '=',
        title: '=',
        importance: '='
      },
      link: link,
      templateUrl: '/app/templates/nav/dropDownNav.html'
    }
  });