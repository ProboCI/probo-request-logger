'use strict';
var uuid = require('uuid');

module.exports = function logRequest(options) {
  var logger = options.logger;
  var headerName = options.headerName || 'x-request-id';

  function getClientAddress(req) {
    return (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
  }

  return function(req, res, next) {
    var id = req.headers[headerName] || uuid.v4();
    var startOpts = {req: req};

    req.id = id;
    req.log = logger.child({
      id: id,
      serializers: logger.constructor.stdSerializers,
    });

    if (req.body) {
      startOpts.body = req.body;
    }

    res.setHeader(headerName, id);

    var time = process.hrtime();
    res.on('finish', function responseSent() {
      var diff = process.hrtime(time);
      var message = `${getClientAddress(req)} - ${new Date().toISOString()} ${req.method} ${req.url} HTTP/${req.httpVersion} ${res.statusCode}`;
      var context = {
        ip: getClientAddress(req),
        method: req.method,
        url: req.url,
        req,
        res,
        duration: diff[0] * 1e3 + diff[1] * 1e-6,
      };
      req.log.info(context, message);
    });

    next();
  };
};
