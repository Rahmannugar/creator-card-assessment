# Creator Card API

Creator Card API is a Node.js/Express service for publishing shareable creator profile cards with links, service rates, draft/private access controls, and creator-owned deletion.

This project follows the provided Resilience 17 backend template structure: endpoint handlers live in `endpoints/`, business logic lives in `services/`, persistence goes through `repository/`, and MongoDB models live in `models/`.

## Assessment Notes

- Required routes are mounted at the root of the base URL with no version prefix:
  - `POST /creator-cards`
  - `GET /creator-cards/:slug`
  - `DELETE /creator-cards/:slug`
- Public retrieval never returns `access_code`.
- Public retrieval also omits `creator_reference`. This is intentional: `creator_reference` acts as the creator-held delete credential, so a public visitor who can retrieve a card by slug cannot copy that response and delete the card.
- Creation and deletion responses do return `creator_reference`, because those flows are creator-facing.
- Documents use MongoDB `_id` internally, but all API responses serialize it as `id`.
- Deleted cards are soft-deleted and are no longer retrievable through the public GET endpoint.
- The service includes startup MongoDB validation, HTTP timeouts, health/readiness checks, and graceful shutdown.

Excalidraw design: https://excalidraw.com/#json=_4gxaioyXyN9HX3w-Tupb,o5sQkolJvG7nK6t5jFexTA

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
APP_BASE_URL=http://localhost:3003
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
curl http://localhost:3003/live/health
curl http://localhost:3003/live/ready
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
