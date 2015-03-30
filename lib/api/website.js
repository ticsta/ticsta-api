module.exports = function(api, ticsta) {
  var models = ['documents', 'files', 'members', 'groups', 'doctypes', 'groupitems'];
  var VERSION = 'v0';
  return function creator(options) {
    
    function buildList(endpoint) {
      endpoint.list = function(qs, callback) {
        qs = qs || {};
        return this.http.request(this.url(), 'GET', {
          qs: qs
        }, callback);
      };
    }

    var version = options.version || VERSION;
    var website = api.endpoint(version, {});
    website.options.host = options.host;

    var oneWebsite = website.one(options.id);

    models.forEach(function(model) {
      oneWebsite[model] = oneWebsite.endpoint(model, {});
      buildList(oneWebsite[model]);
    });

    return oneWebsite;
  };
};
