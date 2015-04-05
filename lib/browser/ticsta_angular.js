angular.module('ticsta', [])
  .provider('ticsta', function() {
    var Ticsta = require('../ticsta');
    var Http = require('narrator2').Http;
    var asQ = require('narrator2/lib/browser/asQ');
    var asHttp = require('narrator2/lib/browser/asHttp');
    var cache = require('./cache');

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
        cache(Http);

        return Ticsta.createClient(this._options);
      }]
    };
  });
