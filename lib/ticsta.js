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
