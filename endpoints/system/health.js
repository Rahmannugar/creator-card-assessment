const { createHandler } = require('@app-core/server');

module.exports = createHandler({
  path: '/healthz',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'OK',
      data: {
        status: 'ok',
        uptime_seconds: Math.round(process.uptime()),
      },
    };
  },
});
