# Netlify Demo Deployment

This repo can deploy to Netlify as:

- Expo web static assets from `dist/`
- Express API routes through a Netlify Function at `/api/*`

## Netlify Site Settings

Use the GitHub repo:

```text
sdaj1297/pasbaneaza-expo
```

Recommended flow:

1. In Netlify, choose "Add new site" -> "Import an existing project".
2. Connect GitHub and select `sdaj1297/pasbaneaza-expo`.
3. Use the `master` branch unless we create a beta branch later.
4. Let Netlify read `netlify.toml`.
5. Add the environment variables below before the first functional API deploy.

Build settings are in `netlify.toml`:

```text
Build command: npm run build:web
Publish directory: dist
Functions directory: netlify/functions
```

## Environment Variables

Set these in Netlify site settings. Do not commit secrets.

```env
EXPO_PUBLIC_API_BASE_URL=/api
EXPO_PUBLIC_DATA_BACKEND=firebase
EXPO_PUBLIC_FIREBASE_API_KEY=<from Firebase config>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<from Firebase config>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<from Firebase config>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<from Firebase config>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<from Firebase config>
EXPO_PUBLIC_FIREBASE_APP_ID=<from Firebase config>
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=<from Firebase config>
NODE_ENV=production
PASBAN_DB_HOST=<cloud-mysql-host>
PASBAN_DB_PORT=4000
PASBAN_DB_NAME=<database-name>
PASBAN_DB_USER=<database-user>
PASBAN_DB_PASSWORD=<database-password>
PASBAN_DB_SSL=true
PASBAN_DB_SSL_REJECT_UNAUTHORIZED=true
```

If `EXPO_PUBLIC_DATA_BACKEND=firebase`, the Expo app reads Firestore directly. The SQL variables are only needed if we keep the Netlify Function API connected to a MySQL-compatible beta database.

Use the actual port required by the database provider. Some MySQL-compatible cloud databases use `3306`; TiDB Cloud often uses `4000`.

If a provider requires IP allowlisting, remember that Netlify Functions do not give this project a simple fixed outbound IP on the normal plans. For a demo, choose a database provider that allows public TLS connections or lets you allow all IPs temporarily while keeping strong database credentials.

## Database

Netlify does not host MySQL. For a functional beta, import the SQL export into a remotely accessible MySQL-compatible database and point the Netlify environment variables to it.

For a UI-only demo, omit the DB env vars. The frontend will fall back to mock data when API calls fail, but event edits/status/form tests will not be durable.

## Import Command Shape

If the database provider gives a normal MySQL host, port, username, and database name, import the cleaned export from a machine that has the MySQL CLI:

```bash
mysql --ssl-mode=REQUIRED -h <host> -P <port> -u <user> -p <database> < "C:\Users\danis\Downloads\pasbaaza_apacom_beta_import.sql"
```

If the provider has a browser import tool, use the same cleaned SQL file there instead.

After import, run the app migration against that database:

```bash
npm run db:migrate
```

Then verify:

```bash
npm run verify:api
```
