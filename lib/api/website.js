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

    return oneWebsite;
  };
};
