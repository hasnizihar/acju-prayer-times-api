# Security Policy

## Supported Versions

Currently, the `v1` REST API is actively supported for security updates.

## Reporting a Vulnerability

If you discover a security vulnerability within this API, please report it via GitHub issues or directly to the project maintainers. Do not exploit vulnerabilities publicly before they are patched.

## Secret Handling

The `SUPABASE_SERVICE_ROLE_KEY` and the raw `postgresql://` database passwords carry extreme privileges. 

- **NEVER** commit your `.env` file containing these keys to GitHub.
- **NEVER** expose these keys in a public-facing Frontend client (like a React or Flutter app).
- **NEVER** paste them in logs or chat systems.

The `.env` file is explicitly included in the `.gitignore` to prevent accidental inclusion. If you believe your database password was compromised, rotate it immediately in the Supabase Dashboard.
