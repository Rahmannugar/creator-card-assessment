# Creator Card API

This file documents the application API contract for the assessment endpoints.

Base URL:

```txt
http://localhost:3003
```

## Response Envelope

Successful responses use:

```json
{
  "status": "success",
  "message": "Human readable message",
  "data": {}
}
```

Custom business rule errors use:

```json
{
  "status": "error",
  "message": "Human readable message",
  "code": "NF01"
}
```

Template validation errors return HTTP `400` with the template's validation error shape.

## Create Creator Card

`POST /creator-cards`

Creates a Creator Card. If `slug` is omitted, it is generated from the title and made unique.

Required fields:

- `title`: string, 3-100 characters
- `creator_reference`: string, exactly 20 characters
- `status`: `draft` or `published`

Optional fields:

- `description`: string, max 500 characters
- `slug`: string, 5-50 characters, letters, numbers, hyphens, and underscores only
- `links`: array of `{ "title": string, "url": string }`
- `service_rates`: object with `currency` and non-empty `rates`
- `access_type`: `public` or `private`, defaults to `public`
- `access_code`: exactly 6 alphanumeric characters, required only for private cards

Example request:

```json
{
  "title": "George Cooks",
  "description": "Weekly cooking podcast",
  "slug": "george-cooks",
  "creator_reference": "crt_8f2k1m9x4p7w3q5z",
  "links": [{ "title": "YouTube", "url": "https://youtube.com/@georgecooks" }],
  "service_rates": {
    "currency": "NGN",
    "rates": [{ "name": "IG Story Post", "description": "One story mention", "amount": 5000000 }]
  },
  "status": "published",
  "access_type": "public"
}
```

Success: HTTP `200`

```json
{
  "status": "success",
  "message": "Creator Card Created Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "Weekly cooking podcast",
    "slug": "george-cooks",
    "links": [{ "title": "YouTube", "url": "https://youtube.com/@georgecooks" }],
    "service_rates": {
      "currency": "NGN",
      "rates": [{ "name": "IG Story Post", "description": "One story mention", "amount": 5000000 }]
    },
    "status": "published",
    "access_type": "public",
    "created": 1767052800000,
    "updated": 1767052800000,
    "deleted": null,
    "access_code": null,
    "creator_reference": "crt_8f2k1m9x4p7w3q5z"
  }
}
```

Business errors:

- `SL02`, HTTP `400`: slug already exists
- `AC01`, HTTP `400`: private card missing `access_code`
- `AC05`, HTTP `400`: public card includes `access_code`

## Retrieve Creator Card

`GET /creator-cards/:slug`

Retrieves a published card by slug. Private cards require `access_code` as a query parameter.

Example:

```txt
GET /creator-cards/george-cooks
GET /creator-cards/vip-rate-card?access_code=A1B2C3
```

Success: HTTP `200`

```json
{
  "status": "success",
  "message": "Creator Card Retrieved Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "Weekly cooking podcast",
    "slug": "george-cooks",
    "links": [{ "title": "YouTube", "url": "https://youtube.com/@georgecooks" }],
    "status": "published",
    "access_type": "public",
    "created": 1767052800000,
    "updated": 1767052800000,
    "deleted": null
  }
}
```

Retrieval responses intentionally omit `access_code` and `creator_reference`.

Business errors are evaluated in this order:

- `NF01`, HTTP `404`: card does not exist or has been deleted
- `NF02`, HTTP `404`: card exists but is a draft
- `AC03`, HTTP `403`: private card requires an access code
- `AC04`, HTTP `403`: invalid access code

## Delete Creator Card

`DELETE /creator-cards/:slug`

Deletes a card by slug. The request must include the creator-held `creator_reference`.

Example request:

```json
{
  "creator_reference": "crt_8f2k1m9x4p7w3q5z"
}
```

Success: HTTP `200`

```json
{
  "status": "success",
  "message": "Creator Card Deleted Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "Weekly cooking podcast",
    "slug": "george-cooks",
    "links": [{ "title": "YouTube", "url": "https://youtube.com/@georgecooks" }],
    "status": "published",
    "access_type": "public",
    "created": 1767052800000,
    "updated": 1767139200000,
    "deleted": 1767139200000,
    "access_code": null,
    "creator_reference": "crt_8f2k1m9x4p7w3q5z"
  }
}
```

Business errors:

- `NF01`, HTTP `404`: card does not exist, has been deleted, or the creator reference does not match

## System Endpoints

`GET /health/live`

Returns basic process health.

`GET /health/ready`

Returns readiness based on MongoDB connection state.
