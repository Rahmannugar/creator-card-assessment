# Creator Card API

Creator Card API is a Node.js/Express service for publishing shareable creator profile cards with links, service rates, draft/private access controls, and creator-owned deletion.

This project follows the provided Resilience 17 backend template structure: endpoint handlers live in `endpoints/`, business logic lives in `services/`, persistence goes through `repository/`, and MongoDB models live in `models/`.

System design: https://excalidraw.com/#json=_4gxaioyXyN9HX3w-Tupb,o5sQkolJvG7nK6t5jFexTA

## Implementation Notes

- Routes are mounted at the root of the base URL with no version prefix:
  - `POST /creator-cards`
  - `GET /creator-cards/:slug`
  - `DELETE /creator-cards/:slug`
- Public retrieval omits `access_code` and `creator_reference`.
- Creation and deletion return `creator_reference` for creator-facing flows.
- MongoDB documents keep `_id` internally; API responses expose `id`.
- Deleted cards are soft-deleted and excluded from public retrieval.
- The runtime includes MongoDB startup validation, HTTP timeouts, health checks, and graceful shutdown.

## API Documentation

The app API contract for the three assessment endpoints is in [API.md](./API.md).

## Requirements

- Node.js 18+
- npm
- MongoDB Atlas or another reachable MongoDB instance

## Environment

Create a `.env` file from `.env.example` and add your MongoDB URL:

```env
PORT=3003
APP_NAME=creator-card-api
MONGODB_URI=<your-mongodb-url>
```

Useful operational defaults are already listed in `.env.example`:

```env
HTTP_REQUEST_TIMEOUT_MS=30000
HTTP_HEADERS_TIMEOUT_MS=35000
HTTP_KEEP_ALIVE_TIMEOUT_MS=5000
GRACEFUL_SHUTDOWN_TIMEOUT_MS=10000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_MAX_POOL_SIZE=10
```

## Running Locally

```bash
npm install
npm start
```

Health checks:

```bash
curl http://localhost:3003/health/live
curl http://localhost:3003/health/ready
```

Create a card:

```bash
curl -X POST http://localhost:3003/creator-cards \
  -H "Content-Type: application/json" \
  -d '{
    "title": "George Cooks",
    "description": "Weekly cooking podcast",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "links": [{"title": "YouTube", "url": "https://youtube.com/@georgecooks"}],
    "service_rates": {
      "currency": "NGN",
      "rates": [{"name": "IG Story Post", "description": "One story mention", "amount": 5000000}]
    },
    "status": "published"
  }'
```
