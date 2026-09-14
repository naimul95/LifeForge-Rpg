# Environment Configuration

The application reads environment variables through `src/lib/env.ts`. That module is server-only and validates the complete environment at startup with Zod. It reports variable names and validation messages only; it never logs values.

## Local development

1. Copy `.env.example` to `.env`.
2. Fill in the values in `.env` on your machine.
3. Do not commit `.env`; it is explicitly ignored by Git.
4. Restart the development server after changing environment variables.

The checked-in `.env.example` intentionally contains no credentials or connection strings.

## Variables

| Variable | Source | Use |
| --- | --- | --- |
| `DATABASE_URL` | Neon Console, project connection details, pooled connection string | Prisma and PostgreSQL access |
| `GOOGLE_CLIENT_ID` | Google Cloud Console, APIs & Services, Credentials, OAuth 2.0 Client ID | Identifies the Google OAuth application |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console, the same OAuth 2.0 Client | Server-side OAuth token exchange |
| `JWT_SECRET` | Generate locally with a cryptographically secure random generator | Signs and verifies authentication JWTs; use a different value per environment |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Console, Product Environment details | Selects the Cloudinary account |
| `CLOUDINARY_API_KEY` | Cloudinary Console, Product Environment, API Keys | Server-side Cloudinary API authentication |
| `CLOUDINARY_API_SECRET` | Cloudinary Console, Product Environment, API Keys | Signs Cloudinary operations; server-only |
| `APP_URL` | The deployed application origin, or `http://localhost:3000` locally | Server-side OAuth callback and browser origin configuration |

## Production

Add these values to the Vercel project under **Settings -> Environment Variables**, separately for Preview and Production where appropriate. Vercel injects them at runtime; do not put production secrets in the repository or source code.

`APP_URL` is server-only. All variables are server secrets or server connection settings and must be accessed only through the server-only environment module. Never rename a secret with a `NEXT_PUBLIC_` prefix.

For Google OAuth, register the matching production callback URL in Google Cloud Console. For Neon and Cloudinary, use the credentials from the project/account that belongs to the target deployment environment.
