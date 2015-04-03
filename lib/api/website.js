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
