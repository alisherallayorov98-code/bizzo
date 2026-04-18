# BIZZO API — Postman

## Import

1. Backendni ishga tushiring: `npm run start:dev`
2. Postman → **Import** → **Link** → `http://localhost:4000/api/docs-json`
3. Collection avtomatik yaratiladi (OpenAPI 3.0 dan).

## Environment

| O'zgaruvchi | Qiymat (dev) |
|-------------|---------------|
| `baseUrl` | `http://localhost:4000/api/v1` |
| `accessToken` | login dan olingan |
| `refreshCookie` | browser cookies dan |

## Auth setup

1. `POST {{baseUrl}}/auth/login` — email/password
2. Javobdan `accessToken` ni oling
3. Collection **Authorization** → Bearer Token → `{{accessToken}}`
4. Refresh uchun `POST /auth/refresh` — cookie avtomatik

## Example request

```http
GET {{baseUrl}}/contacts?page=1&limit=20
Authorization: Bearer {{accessToken}}
```
