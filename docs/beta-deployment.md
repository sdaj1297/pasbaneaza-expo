# Beta Deployment

Use these values for the `pasbaneaza.com` beta environment. Store the password only in the hosting provider's secret/environment-variable UI, never in git.

```env
PASBAN_DB_HOST=localhost
PASBAN_DB_PORT=3306
PASBAN_DB_NAME=pasbaaza_apacom_beta
PASBAN_DB_USER=pasbaaza_apacom_user
PASBAN_DB_PASSWORD=<set in hosting secrets>
PASBAN_API_PORT=3001
EXPO_PUBLIC_API_BASE_URL=https://pasbaneaza.com/api
```

If the API is deployed somewhere other than the HostGator account that owns the database, `PASBAN_DB_HOST=localhost` will not work. In that case use the HostGator MySQL hostname and allow the API server IP in cPanel Remote MySQL.

The beta database is a cloned testing database. Testers can create, edit, delete, and update data there without changing the current production `pasbaneaza.org` database.
