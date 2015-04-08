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
