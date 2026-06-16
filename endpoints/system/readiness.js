const mongoose = require('mongoose');
const { createHandler } = require('@app-core/server');

module.exports = createHandler({
  path: '/health/ready',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const isMongoReady = mongoose.connection.readyState === 1;

    return {
      status: isMongoReady
        ? helpers.http_statuses.HTTP_200_OK
        : helpers.http_statuses.HTTP_500_SERVER_ERROR,
      message: isMongoReady ? 'Ready' : 'Not ready',
      data: {
        mongo: isMongoReady ? 'connected' : 'disconnected',
      },
    };
  },
});
