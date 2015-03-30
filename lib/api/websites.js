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
      website.domains = website.endpoint('domains', {});

      // DOMAINS
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
