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

      // DELETE /websites/:id
      website.remove = function(callback) {
        return this.http.request(this.url(), 'DELETE', callback);
      };

      // GET /websites/:id/node
      website.node = function(callback) {
        return this.http.request(this.url() + '/node', 'GET', callback);
      };

      // DOMAINS
      website.domains = website.endpoint('domains', {

        // PUT /websites/:id/domains/:domain
        update: function(domain, data, callback) {
          return this.http.request(this.url() + '/' + domain, 'PUT', {
            form: data
          }, callback);
        },
        // DELETE /websites/:id/domains/:domain
        remove: function(domain, callback) {
          return this.http.request(this.url() + '/' + domain, 'DELETE', callback);
        }
      });

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
        },

        // PUT /websites/:id/members/:member
        update: function(member, data, callback) {
          return this.http.request(this.url() + '/' + member, 'PUT', {
            form: data
          }, callback);
        },
        // DELETE /websites/:id/members/:domain
        remove: function(member, callback) {
          return this.http.request(this.url() + '/' + member, 'DELETE', callback);
        }
      });

      return website;
    }
  });

  return websites;
};
