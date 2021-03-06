(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(api, ticsta, credentials) {

  var user = api.endpoint('accounts', {
    credentials: credentials,

    authenticate: function(callback) {
      var self = this;

      if (this.credentials.token) {
        if (callback) {
          return callback(null, this.credentials.token);
        }
        return this.credentials.token;
      }

      return this.http._http(this.options.host + '/access_token', 'GET', {
        headers: {
          'x-api-key': this.credentials.key
        }
      }, function(err, response, body) {
        if (callback && err || body.status) {
          err = err || body.error;
          return callback(err);
        }

        self.credentials.token = body.access_token || body.token || self.credentials.token;
        ticsta.setToken(self.credentials.token);
        if (callback) {
          callback(err, self.credentials.token);
        }
      });
    },

    setCredentials: function(credentials) {
      if (!this.credentials) {
        this.credentials = {};
      }

      this.credentials.key = credentials.key;
      this.credentials.token = credentials.token;
    },

    me: function(callback) {
      return this.http.request(this.url() + '/me', 'GET', callback);
    },

    regenerateKey: function(callback) {
      return this.http.request(this.url() + '/me/key', 'PUT', callback);
    }
  });

  return user;
};

},{}],2:[function(require,module,exports){
module.exports = {
  account: require('./account.js'),
  websites: require('./websites.js'),
  nodes: require('./nodes.js'),
  website: require('./website.js')
};

},{"./account.js":1,"./nodes.js":3,"./website.js":4,"./websites.js":5}],3:[function(require,module,exports){
module.exports = function(api, ticsta) {

  var nodes = api.endpoint('nodes', {

    // GET /nodes/active
    active: function(callback) {
      return this.http.request(this.url() + '/active', 'GET', callback);
    }
  });

  return nodes;
};

},{}],4:[function(require,module,exports){
module.exports = function(api, ticsta) {
  var models = ['documents', 'files', 'members', 'groups', 'doctypes', 'groupitems'];
  var VERSION = 'v0';
  return function creator(options) {

    var version = options.version || VERSION;
    var website = api.endpoint(version, {});
    website.options.host = options.host;

    var oneWebsite = website.one(options.id);

    models.forEach(function(model) {
      oneWebsite[model] = oneWebsite.endpoint(model, {
        count: function(callback, options) {
          if (callback && (typeof callback === 'object')) {
            options = callback;
            callback = undefined;
          }
          return this.http.request(this.url() + '/count', 'GET', options, callback);
        }
      });
    });

    oneWebsite.publisher = oneWebsite.endpoint('publisher', {
      _pub: function(url, method, callback, options) {
        if (callback && (typeof callback === 'object')) {
          options = callback;
          callback = undefined;
        }
        return this.http.request(url, method, options, callback);
      },
      reset: function(callback, options) {
        return this.create(null, callback, options);
      },
      publishDocument: function(id, callback, options) {
        return this._pub(this.url() + '/documents/' + id, 'PUT', callback, options);
      },
      unpublishDocument: function(id, callback, options) {
        return this._pub(this.url() + '/documents/' + id, 'DELETE', callback, options);
      }
    });

    return oneWebsite;
  };
};

},{}],5:[function(require,module,exports){
module.exports = function(api, ticsta) {
  //var user = require('./user')(api);

  var websites = api.endpoint('websites', {

    // GET /websites/my
    my: function(callback) {
      return this.http.request(this.url() + '/my', 'GET', callback);
    },

    // GET /websites/:id
    id: function(id) {
      var website = this.one(id);

      // GET /websites/:id/node
      website.node = function(callback) {
        return this.http.request(this.url() + '/node', 'GET', callback);
      };

      // DOMAINS
      website.domains = website.endpoint('domains', {
        id: function(id) {
          var domain = this.one(id);
          // TEMPLATES
          domain.templates = domain.endpoint('templates', {});

          return domain;
        }
      });

      // MEMBERS
      website.members = website.endpoint('members', {

        // GET /websites/:id/members/me
        me: function(callback) {
          return this.http.request(this.url() + '/me', 'GET', callback);
        },

        // POST /websites/:id/members/invite
        invite: function(data, callback) {
          return this.http.request(this.url() + '/invite', 'POST', {
            form: data
          }, callback);
        }
      });

      return website;
    }
  });

  return websites;
};

},{}],6:[function(require,module,exports){
var cache = require('active-memory')({
  ttl: 1000 * 60
});
var internal = {};

module.exports = function(Http) {

  var _request = Http.prototype._request;

  Http.prototype._request = function(options, callback) {
    var info = internal.getCacheInfo(options);
    if (!info) {
      return _request.call(this, options, callback);
    }

    //console.log('info', info);

    if (info.method === 'GET') {
      var result = cache.get(info.type, info.key);
      if (result) {
        //console.log('from cache', result);
        result = {
          data: result
        };
        return callback(null, result, result);
      }
    }

    _request.call(this, options, function(err, data1, data2) {
      if (err) {
        return callback(err);
      }
      if (info.method === 'GET' && options.cache !== false) {
        cache.set(info.type, info.key, data1.data);
      } else if (info.method === 'PUT') {
        var item = options.data || options.form;
        item.id = item.id || info.id;
        cache.update(info.type, info.key, item);
      } else if (info.method === 'POST') {
        cache.add(info.type, data1.data);
      } else if (info.method === 'DELETE') {
        cache.remove(info.type, {
          id: info.id
        });
      }
      callback(null, data1, data2);
    });
  };

};

internal.getCacheInfo = function(options) {
  var info = {
    key: options.url,
    method: options.method.toUpperCase()
  };

  var plus = JSON.stringify(options.params || options.qs || '');

  info.key += (plus.length > 1 ? plus : '');
  info.key = info.key.toLowerCase();

  for (var i = 0; i < config.finders.length; i++) {
    var f = config.finders[i];
    var r = f.exec(options.url);
    if (r) {
      //console.log(r);
      info.type = r[1];
      if (r.length > 2) {
        info.id = r[2];
      }
      break;
    }
  }

  if (!info.type) {
    return null;
  }

  return info;
};

var config = {
  finders: [
    /\/v\d\/(websites)\/my$/,
    /\/v\d\/(websites)\/(\d+)$/,
    /\/v\d\/(websites)$/,
    /\/v\d\/(nodes)\/active$/,
    /\/v\d\/websites\/(?:\d+)\/(domains)$/,
    // /\/v\d\/websites\/(?:\d+)\/(domains)\/([\w\d]+)$/,
    /\/v\d\/websites\/(?:\d+)\/(members)$/,
    /\/v\d\/websites\/(?:\d+)\/(members)\/([\w\d]+)$/,
    /\/v\d\/(?:\d+)\/(doctypes)$/,
    /\/v\d\/(?:\d+)\/(doctypes)\/([\w\d]+)$/,
    /\/v\d\/(?:\d+)\/(documents)$/,
    /\/v\d\/(?:\d+)\/(documents)\/([\w\d-]+)$/,
    /\/v\d\/(?:\d+)\/(groups)$/,
    /\/v\d\/(?:\d+)\/(groups)\/([\w\d]+)$/
  ]
};

},{"active-memory":10}],7:[function(require,module,exports){
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

},{"../ticsta":9,"./cache":6,"narrator2":22,"narrator2/lib/browser/asHttp":16,"narrator2/lib/browser/asQ":17}],8:[function(require,module,exports){
module.exports = function(options, defaults) {
  options = options || {};

  Object.keys(defaults).forEach(function(key) {
    if (typeof options[key] === 'undefined') {
      options[key] = defaults[key];
    }
  });

  return options;
};
},{}],9:[function(require,module,exports){
(function (process){
var Narrator = require('narrator2');
var Emitter = require('tiny-emitter');
var extend = require('amp-extend');
var reemitter = require('re-emitter');

var defaults = require('./helpers/defaults');
var api = require('./api');

var TICSTA_API_VERSION = 'v0';

var Ticsta = function(options) {
  this.defaults = {};
  this.options = defaults(options, this.defaults);
  this.events = new Emitter();

  var self = this;
  var apiOptions = {
    host: process.env.TICSTA_API_URL || options.host || 'https://api.ticsta.com',
    headers: {}
  };

  var version = process.env.TICSTA_API_VERSION || options.version || TICSTA_API_VERSION;

  apiOptions.host += '/' + version;

  this._api = new Narrator(apiOptions);

  if (options.token) {
    this.setToken(options.token);
  }

  this.account = api.account(this._api, this, options);
  this.websites = api.websites(this._api, this);
  this.nodes = api.nodes(this._api, this);
  this.website = api.website(this._api, this);

  // Forward Narrator events
  reemitter(this._api, this.events, ['response', 'response:success', 'response:error']);
};

Ticsta.createClient = function(options) {
  return new Ticsta(options);
};

Ticsta.prototype.setToken = function(token) {
  this.options.token = token;
  this._api.headers['authentication'] = 'token ' + token;
};

Ticsta.prototype.setKey = function(key) {
  this.options.key = key;
};

module.exports = Ticsta;

}).call(this,require('_process'))
},{"./api":2,"./helpers/defaults":8,"_process":15,"amp-extend":11,"narrator2":22,"re-emitter":25,"tiny-emitter":26}],10:[function(require,module,exports){
(function(root) {

  if (typeof define === "function" && define.amd) {
    define([""], function() {
      return (root.activeMemory = ActiveMemoryBuilder);
    });
  } else if (typeof exports === "object") {
    module.exports = ActiveMemoryBuilder;
  } else {
    root.activeMemory = ActiveMemoryBuilder;
  }


  function ActiveMemoryBuilder(options) {

    options = utils.defaults(options, {
      ttl: 0,
      idName: 'id'
    });

    var cache = {};

    var internal = {
      getIdName: function(type) {
        return options.idName;
      },
      createCacheItem: function(value, opts) {
        var expires = opts && utils.isNumber(opts.ttl) ? opts.ttl : options.ttl;
        if (expires > 0) {
          expires = Date.now() + expires;
        }
        //console.log('expires', expires, opts, options);
        return {
          format: utils.isArray(value) ? 'l' : 'i',
          value: value,
          expires: expires
        };
      },
      container: function(type) {
        return cache[type] || (cache[type] = {
          all: {},
          item: {},
          list: {}
        });
      },
      pick: function(type, key) {
        var container = internal.container(type);
        return container.all[key];
      },
      get: function(type, key) {
        var item = internal.pick(type, key);
        if (!item) return;
        if (internal.isExpired(item)) {
          internal.clearKey(type, key);
          return;
        }

        return item.value;
      },
      set: function(type, key, value, opts) {
        var item = internal.pick(type, key);

        if (item) {
          return internal.update(type, key, value, opts);
        }
        item = internal.createCacheItem(value, opts);

        var container = internal.container(type);
        container.all[key] = item;
        if (item.format === 'i') {
          container.item[key] = item;
        } else {
          container.list[key] = item;
        }
      },
      update: function(type, key, value, opts) {
        //console.log('updating', type, key, value);
        var container = internal.container(type);
        var item = container.all[key];
        if (!item) {
          item = internal.createCacheItem(value, opts);
          if (item.format === 'i') {
            internal.updateListsItem(type, item, opts);
          }
          return;
        }

        if (item.format === 'i') {
          for (var prop in value) {
            item.value[prop] = value[prop];
          }
          internal.updateListsItem(type, item, opts);
        } else {
          item.value.splice(0, item.value.length);
          value.forEach(function(it) {
            item.value.push(it);
          });
        }
      },
      updateListsItem: function(type, item, opts) {
        //console.log('updating updateListsItem', type, item);
        var container = internal.container(type);
        var listsItemInfo = internal.getListsItemInfo(container, type, item);
        //console.log(listsItemInfo);
        for (var i = listsItemInfo.length - 1; i >= 0; i--) {
          var info = listsItemInfo[i];
          for (var prop in item.value) {
            info.item[prop] = item.value[prop];
          }
        }
      },
      isExpired: function(item) {
        return item.expires > 0 && Date.now() > item.expires;
      },
      remove: function(type, key) {
        var item;
        var container = internal.container(type);
        if (utils.isString(key)) {
          item = container.all[key];
          return internal.removeItem(container, type, key, item);
        } else {
          item = internal.createCacheItem(key);
          return internal.removeItem(container, type, null, item);
        }
      },
      clear: function() {
        cache = {};
      },
      clearKey: function(type, key) {
        var container = internal.container(type);
        delete container.all[key];
        delete container.item[key];
        delete container.list[key];
      },
      removeItem: function(container, type, key, item) {
        if (key) {
          internal.clearKey(type, key);
        }

        if (item && item.format === 'i') {
          var listsItemInfo = internal.getListsItemInfo(container, type, item);
          for (var i = listsItemInfo.length - 1; i >= 0; i--) {
            var info = listsItemInfo[i];
            info.list.splice(info.index, 1);
          }
        }
      },
      add: function(type, value, opts) {
        var item = internal.createCacheItem(value, opts);
        if (item.format !== 'i') return;

        var lists = internal.container(type).list;

        for (var key in lists) {
          var list = lists[key];
          list.value.push(item.value);
        }
      },
      getListsItemInfo: function(container, type, item) {
        var idName = internal.getIdName(type);
        var result = [];
        for (var key in container.list) {
          var list = container.list[key].value;
          for (var i = list.length - 1; i >= 0; i--) {
            var it = list[i];
            if (it[idName].toString() === item.value[idName].toString()) {
              result.push({
                list: list,
                item: it,
                index: i
              });
              break;
            }
          }
        }
        return result;
      }
    };

    var am = {
      get: function(type, key) {
        return internal.get(type, key);
      },
      set: function(type, key, value, opts) {
        return internal.set(type, key, value, opts);
      },
      remove: function(type, key, opts) {
        return internal.remove(type, key, opts);
      },
      update: function(type, value, opts) {
        return internal.update(type, value, opts);
      },
      add: function(type, value, opts) {
        return internal.add(type, value, opts);
      },
      clear: internal.clear
    };

    return am;
  }


  var utils = {
    defaults: function(options, defaults) {
      options = options || {};

      Object.keys(defaults).forEach(function(key) {
        if (typeof options[key] === 'undefined') {
          options[key] = defaults[key];
        }
      });

      return options;
    },
    isArray: function(target) {
      return Array.isArray(target);
    },
    isNumber: function(target) {
      return typeof target === 'number';
    },
    isString: function(target) {
      return typeof target === 'string';
    }
  };
})(this);

},{}],11:[function(require,module,exports){
var isObject = require('amp-is-object');


module.exports = function(obj) {
    if (!isObject(obj)) return obj;
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
        source = arguments[i];
        for (prop in source) {
            obj[prop] = source[prop];
        }
    }
    return obj;
};

},{"amp-is-object":12}],12:[function(require,module,exports){
module.exports = function isObject(obj) {
    var type = typeof obj;
    return !!obj && (type === 'function' || type === 'object');
};

},{}],13:[function(require,module,exports){

},{}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],15:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],16:[function(require,module,exports){
module.exports = function(Http, $http) {
  Http.prototype._request = function(options, callback) {
    options.data = options.data || options.form;

    // Add any special xhr fields
    angular.extend(options, this.options.context.options.api._xhr);

    if (options.qs && !options.params) {
      options.params = options.qs;
    }
    $http(options)
      .success(function(data) {
        var body = data.self || data;
        callback(null, body, body);
      }).error(function(err) {
        callback(err);
      });
  };
};

},{}],17:[function(require,module,exports){
module.exports = function (Http, $rootScope, $q) {
  Http.prototype._promiseWrap = function (callback) {
    var d = $q.defer();
    
    callback(function (data) {
      $rootScope.narratorApply(function () {
        d.resolve(data);
      });
    }, function (err) {
      $rootScope.narratorApply(function () {
        d.reject(err);
      });
    });
    
    return d.promise;
  };
};
},{}],18:[function(require,module,exports){
var defaults = require('./helpers/defaults');
var extend = require('extend');
var urljoin = require('url-join');
var Http = require('./http');

var Endpoint = module.exports = function (options) {
  this.hooks = {
    pre: function (next) { next(); }
  };
  
  this.options = {
    host: '',
    path: '',
    headers: {},
    _endpoints: {}
  };
  
  if(!options) {
    options = {};
  }
  
  if (!options.userDefined) {
    options.userDefined = {};
  }
  
  defaults(options.userDefined.hooks, this.hooks);
  extend(this.options, options);
  extend(this, options.userDefined);
  
  this.http = new Http({
    context: this,
    headers: this.options.headers,
    hooks: this.hooks
  });
};

// Placed here because of circular dependency stuff
var Entity = require('./entity');

// TODO: make this endpoint work too
// Placed here because of circular dependency stuff
// var Narrator = require('./narrator');

// Endpoint.prototype.endpoint = function (path, customMethods) {
//     var api = new Narrator({
//       host: this.url(),
//       headers: this.options.headers,
//       _endpoints: this.options._endpoints
//     });
    
//     return api.endpoint(path, customMethods);
// };

Endpoint.prototype.url = function () {
  return urljoin(this.options.host, this.options.path);
};

Endpoint.prototype.one = function (id, userDefined) {
  var entity = new Entity({
    _endpoints: this.options._endpoints,
    host: this.options.host,
    path: urljoin('/', this.options.path),
    headers: this.options.headers,
    userDefined: userDefined || {},
    id: id,
    api: this.options.api
  });
  
  return entity;
};

Endpoint.prototype.list = function (callback, options) {
  if (callback && (typeof callback === 'object')) {
    options = callback;
    callback = null;
  }
  return this.http.request(this.url(), 'GET', options, function (err, response, list) {
    if (callback) callback(err, list);
  });
};

Endpoint.prototype.create = function (payload, callback, options) {
  if (callback && (typeof callback === 'object')) {
    options = callback;
    callback = null;
  }
  options = options || {};
  options.form = payload;
  
  return this.http.request(this.url(), 'POST', options, function (err, response, body) {
    if (callback) callback(err, body);
  });
};

Endpoint.prototype.getEndpoint = function (path, id) {
  var pathKey = (id) ? path + id : path;
  return this.options._endpoints[pathKey];
};

},{"./entity":19,"./helpers/defaults":20,"./http":21,"extend":23,"url-join":24}],19:[function(require,module,exports){
var Http = require('./http');
var urljoin = require('url-join');
var defaults = require('./helpers/defaults');
var extend = require('extend');

var Entity = module.exports = function (options) {
  this.hooks = {
    pre: function (next) { next(); }
  };
  
  this.options = {
    host: '',
    path: '',
    headers: {},
    id: 0,
    _endpoints: {}
  };
  
  if(!options) {
    options = {};
  }
  
  if (!options.userDefined) {
    options.userDefined = {};
  }
  
  defaults(options.userDefined.hooks, this.hooks);
  
  extend(this.options, options);
  extend(this, options.userDefined);
  
  this.http = new Http({
    context: this,
    headers: this.options.headers,
    hooks: this.hooks
  });
};

// Placed here because of circular dependency stuff
var Narrator = require('./narrator');

Entity.prototype.endpoint = function (path, customMethods) {
  var api = new Narrator({
    id: this.options.id,
    host: this.url(),
    headers: this.options.headers,
    _endpoints: this.options._endpoints
  });
  return api.endpoint(path, customMethods);
};

Entity.prototype.url = function () {
  return urljoin(this.options.host, this.options.path, this.options.id);
};

Entity.prototype.get = function (callback, options) {
  if (callback && (typeof callback === 'object')) {
    options = callback;
    callback = null;
  }
  return this.http.request(this.url(), 'GET', options, function (err, response, data) {
    if (callback) callback(err, data);
  });
};

Entity.prototype.update = function (payload, callback, options) {
  if (callback && (typeof callback === 'object')) {
    options = callback;
    callback = null;
  }
  options = options || {};
  options.form = payload;
  
  return this.http.request(this.url(), 'PUT', options, function (err, response, body) {
    if (callback) callback(err, body);
  });
};

Entity.prototype.remove = function (callback, options) {
  if (callback && (typeof callback === 'object')) {
    options = callback;
    callback = null;
  }
  return this.http.request(this.url(), 'DELETE', options, function (err, response, body) {
    if (callback) callback(err, body);
  });
};

Entity.prototype.getEndpoint = function (path, id) {
  var pathKey = (id) ? path + id : path;
  return this.options._endpoints[pathKey];
};

},{"./helpers/defaults":20,"./http":21,"./narrator":22,"extend":23,"url-join":24}],20:[function(require,module,exports){
arguments[4][8][0].apply(exports,arguments)
},{"dup":8}],21:[function(require,module,exports){
(function (process){
var extend = require('extend');
var defaults = require('./helpers/defaults');
var request = require('request');
var Promise = require('promise');

var Http = module.exports = function (options) {
  this.options = {
    headers: {},
    hooks: {},
    context: {}
  };
  
  extend(this.options, options);
  
  // Be sure we have a promise
  if (hasPromise(this)) {
    this.promise = this.options.context.options.api.promise;
  }
  else {
    this.promise = function (callback) {
      return new Promise(callback);
    };
  }
  
  function hasPromise (obj) {
    return obj.options.context.options && obj.options.context.options.api && obj.options.context.options.api.promise;
  }
};

Http.prototype.setHeaders = function (headers) {
  this.options.headers = headers;
};

Http.prototype.setHeader = function (key, value) {
  this.options.headers[key] = value;
};

Http.prototype.removeHeader = function (key) {
  delete this.options.headers[key];
};

Http.prototype._parseJSON = function (data) {
  try {
    data = JSON.parse(data);
  }
  catch (e) {}
  finally {
    return data;
  }
};

Http.prototype._promiseWrap = function (callback) {
  return new Promise(callback);
};

Http.prototype._request = request;

Http.prototype._http = function (path, method, options, callback) {
  var self = this;
  
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (typeof callback !== 'function') {
    callback = function () {};
  }
  
  var requestOptions = {
    url: path,
    method: method
  };
  
  requestOptions = defaults(options, requestOptions);
  return this._promiseWrap(function (resolve, reject) {
    self._request(requestOptions, function (err, response, body) {
      var responseBody = self._parseJSON(body);
      var api;
      
      // Access to api
      if (self.options.context && self.options.context.options.api) {
        api = self.options.context.options.api;
      }
      
      if (api) {
        api.emit('response', {
          error: err,
          response: response
        });
      }
      
      if (err || response.statusCode >= 400) {
        api.emit('response:error', err || response)
        reject(err);
      }
      else{
        api.emit('response:success', response);
        resolve(responseBody);
      }
      
      callback(err, response, responseBody);
    });
  });
};

Http.prototype.request = function (path, method, options, callback) {
  var self = this;
  
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  var httpOptions = {};
  var httpRequest = {};
  
  extend(httpOptions, {
    headers: this.options.headers
  }, options);
  
  extend(httpRequest, httpOptions, {
    path: path,
    method: method
  });
  
  return this._promiseWrap(function (resolve, reject) {
    // TODO: pass current api context (api, users, etc)
    process.nextTick(function () {
      var preHook = (self.options.hooks && self.options.hooks.pre) ? self.options.hooks.pre : function (next) { next(); };
      
      preHook.call(self.options.context, function () {
        self._http(path, method, httpOptions, callback).then(resolve, reject);
      });
    });
  });
};
}).call(this,require('_process'))
},{"./helpers/defaults":20,"_process":15,"extend":23,"promise":13,"request":13}],22:[function(require,module,exports){
var extend = require('extend');
var urljoin = require('url-join');
var Promise = require('promise');
var Emitter = require('tiny-emitter');

var Narrator = module.exports = function (options) {
  options = options || {};
  
  this._endpoints = {};
  this.host = '/';
  
  extend(this, new Emitter(), options);
  
  // FIXME: This is a hacky to expose some features
  var http = this.endpoint('').http;
  this._request = http._http;
  this.createPromise = http._promiseWrap;
};

Narrator.Http = require('./http');

// Placed here because of circular dependency stuff
var Endpoint = require('./endpoint');

Narrator.prototype.endpoint = function (path, userDefined) {
  var pathKey = (this.id) ? path + this.id : path;
  
  if(!(pathKey in this._endpoints)) {
    var endpoint = new Endpoint({
      host: this.host,
      path: urljoin('/', path),
      headers: this.headers,
      userDefined: userDefined || {},
      _endpoints: this._endpoints,
      api: this
    });
    
    this._endpoints[pathKey] = endpoint;
  }
  
  return this._endpoints[pathKey];
};

// Add support for special xhr cases
Narrator.prototype._xhr = {};

Narrator.prototype.withCredentials = function (_withCreds) {
  this.xhr('withCredentials', _withCreds);
  return this;
};

Narrator.prototype.xhr = function (key, value) {
  this._xhr[key] = value;
  return this;
};
},{"./endpoint":18,"./http":21,"extend":23,"promise":13,"tiny-emitter":26,"url-join":24}],23:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],24:[function(require,module,exports){
function normalize (str) {
  return str
          .replace(/[\/]+/g, '/')
          .replace(/\/\?/g, '?')
          .replace(/\/\#/g, '#')
          .replace(/\:\//g, '://');
}

module.exports = function () {
  var joined = [].slice.call(arguments, 0).join('/');
  return normalize(joined);
};
},{}],25:[function(require,module,exports){
module.exports = reemit
module.exports.filter = filter

var EventEmitter = require('events').EventEmitter

function reemit (source, target, events) {
  if (!Array.isArray(events)) events = [ events ]

  events.forEach(function (event) {
    source.on(event, function () {
      var args = [].slice.call(arguments)
      args.unshift(event)
      target.emit.apply(target, args)
    })
  })
}

function filter (source, events) {
  var emitter = new EventEmitter()
  reemit(source, emitter, events)
  return emitter
}

},{"events":14}],26:[function(require,module,exports){
function E () {
	// Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
	on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});
    
    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });
    
    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    var fn = function () {
      self.off(name, fn);
      callback.apply(ctx, arguments);
    };
    
    return this.on(name, fn, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;
    
    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }
    
    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];
    
    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback) liveEvents.push(evts[i]);
      }
    }
    
    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length) 
      ? e[name] = liveEvents
      : delete e[name];
    
    return this;
  }
};

module.exports = E;

},{}]},{},[7]);
