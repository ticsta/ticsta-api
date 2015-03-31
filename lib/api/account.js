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
