<!--
  context/services/ — One file per service. Each file describes the
  PUBLIC INTERFACE of that service: endpoints, key exports, schemas.

  Loaded by context-loader when the ticket touches that service.

  HARD RULES
    - ≤80 lines per file. If it grows beyond, split into multiple files
      (e.g. auth-api-routes.md and auth-api-middleware.md).
    - REPLACE, don't accumulate. Each /nova-wrap rewrites the file
      from scratch when the interface changed.
    - Public interface ONLY. Internal implementation belongs in the code.
-->

# Services — guide

## Filename convention

- **kebab-case** matching the service / module name: `auth-api.md`, `billing.md`, `notifications.md`
- One service per file.

## Suggested structure

```markdown
# <service-name>

## Purpose
One sentence: what does this service do at the highest level?

## Public endpoints / exports
- `POST /api/login` → `Session | AuthError`
- `GET /api/me` → `User`
- `function authenticate(email, password): Result<Session, AuthError>`

## Key schemas
- `Session = { userId, expiresAt, role }`
- `AuthError = "invalid_credentials" | "locked" | "rate_limited"`

## Dependencies
- PostgreSQL `users` table
- Redis `sessions:*` namespace
- External: SendGrid (password reset)

## Notes
Anything subtle a future ticket would need to know.
```

## When `/nova-wrap` updates this

If the ticket changed the public interface of a service, `/nova-wrap`
invokes the `update-service-context` skill which rewrites this file
from scratch. You confirm what changed; the skill writes; ≤80 lines.

You can also rewrite by hand at any time — same rules apply.
