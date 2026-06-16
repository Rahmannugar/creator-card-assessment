/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
if (!process.env.__ALREADY_BOOTSTRAPPED_ENVS) require('dotenv').config();

const fs = require('fs');
const mongoose = require('mongoose');
const { createServer } = require('@app-core/server');
const { createConnection } = require('@app-core/mongoose');
const { createQueue } = require('@app-core/queue');
const { appLogger } = require('@app-core/logger');

const canLogEndpointInformation = process.env.CAN_LOG_ENDPOINT_INFORMATION;

const server = createServer({
  port: process.env.PORT || 3003,
  JSONLimit: '150mb',
  enableCors: true,
  requestTimeoutMillis: Number.parseInt(process.env.HTTP_REQUEST_TIMEOUT_MS, 10) || 30000,
  headersTimeoutMillis: Number.parseInt(process.env.HTTP_HEADERS_TIMEOUT_MS, 10) || 35000,
  keepAliveTimeoutMillis: Number.parseInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 10) || 5000,
});

const ENDPOINT_CONFIGS = [
  {
    path: './endpoints/system/',
  },
  {
    path: './endpoints/creator-cards/',
  },
  {
    path: './endpoints/onboarding/',
  },
];

function logEndpointMetaData(endpointConfigs) {
  const endpointData = [];
  const storageDirName = './endpoint-data';
  const EXEMPTED_ENDPOINTS_REGEX = /onboarding/;

  endpointConfigs.forEach((endpointConfig) => {
    const { path: basePath, options } = endpointConfig;

    const dirs = fs.readdirSync(basePath);

    dirs.forEach((file) => {
      const handler = require(`${basePath}${file}`);

      if (!EXEMPTED_ENDPOINTS_REGEX.test(basePath) && handler.middlewares?.length) {
        const entry = { method: handler.method, endpoint: handler.path };
        entry.name = file.replaceAll('-', ' ').replace('.js', '');
        entry.display_name = `can ${entry.name}`;

        if (options?.pathPrefix) {
          entry.endpoint = `${options.pathPrefix}${entry.endpoint}`;
          entry.name = `${entry.name} (${options.pathPrefix.replace('/', '')})`;
        }

        endpointData.push(entry);
      }
    });
  });

  if (!fs.existsSync(storageDirName)) {
    fs.mkdirSync(storageDirName);
  }

  fs.writeFileSync(`${storageDirName}/endpoints.json`, JSON.stringify(endpointData, null, 2), {
    encoding: 'utf-8',
  });
}

if (canLogEndpointInformation) {
  logEndpointMetaData(ENDPOINT_CONFIGS);
}

function setupEndpointHandlers(basePath, options = {}) {
  const dirs = fs.readdirSync(basePath);

  dirs.forEach((file) => {
    const handler = require(`${basePath}${file}`);

    if (options.pathPrefix) {
      handler.path = `${options.pathPrefix}${handler.path}`;
    }

    server.addHandler(handler);
  });
}

ENDPOINT_CONFIGS.forEach((config) => {
  setupEndpointHandlers(config.path, config.options);
});

async function closeWithTimeout(closeFn, label, timeoutMillis) {
  let timeoutHandle;

  await Promise.race([
    closeFn(),
    new Promise((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`${label} shutdown timed out`)),
        timeoutMillis
      );
    }),
  ]);

  clearTimeout(timeoutHandle);
}

async function startApp() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to start the Creator Card API.');
  }

  await createConnection({
    uri: process.env.MONGODB_URI,
  });

  const queue = createQueue();
  const httpServer = server.startServer();
  const shutdownTimeoutMillis =
    Number.parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10) || 10000;
  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) return;

    isShuttingDown = true;
    appLogger.info({ signal }, 'graceful-shutdown-started');

    try {
      await closeWithTimeout(
        () =>
          new Promise((resolve, reject) => {
            httpServer.close((error) => (error ? reject(error) : resolve()));
          }),
        'http-server',
        shutdownTimeoutMillis
      );

      if (queue?.close) {
        await closeWithTimeout(() => queue.close(), 'queue', shutdownTimeoutMillis);
      }

      await closeWithTimeout(() => mongoose.disconnect(), 'mongodb', shutdownTimeoutMillis);

      appLogger.info({ signal }, 'graceful-shutdown-completed');
      process.exit(0);
    } catch (error) {
      appLogger.errorX(error, 'graceful-shutdown-failed');
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startApp().catch((error) => {
  appLogger.errorX(error, 'app-startup-failed');
  process.exit(1);
});
