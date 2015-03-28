angular.module('ticsta', [])
  .provider('ticsta', function() {
    var Ticsta = require('../ticsta');
    var Http = require('narrator').Http;
    var asQ = require('narrator/lib/browser/asQ');
    var asHttp = require('narrator/lib/browser/asHttp');

    return {
      _options: {},

      configure: function(options) {
        this._options = options;
      },

      $get: ['$rootScope', '$q', '$http', function($rootScope, $q, $http) {
        $rootScope.narratorApply = function(fn) {
          var phase = this.$root.$$phase;
          if (phase === '$apply' || phase === '$digest') {
            if (fn && (typeof(fn) === 'function')) {
              fn();
            }
          } else {
            this.$apply(fn);
          }
        };

        asQ(Http, $rootScope, $q);
        asHttp(Http, $http);

        return Ticsta.createClient(this._options);
      }]
    };
  });
