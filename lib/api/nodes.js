module.exports = function(api, ticsta) {

  var nodes = api.endpoint('nodes', {

    // GET /nodes/active
    active: function(callback) {
      return this.http.request(this.url() + '/active', 'GET', callback);
    }
  });

  return nodes;
};
