# Hosting Options

Last reviewed: 2026-07-24.

Pricing changes often. Before buying anything, confirm the current provider page for the exact plan, region, transfer limits, and database backup policy.

## Recommended Demo Path

Use Netlify for the Expo web app and API function, then put the cloned MySQL data in a cloud MySQL-compatible database.

Why this fits:

- Netlify can build the Expo web export and serve the static `dist/` bundle.
- Netlify Functions can run the Express API behind `/api/*`.
- We do not need HostGator Node support for the demo.
- The only missing hosted piece is MySQL or a MySQL-compatible database.

Best first database choices:

1. Railway MySQL
   - Good fit if we want the least friction with a real MySQL database.
   - Pricing starts around the low hobby tier with usage credits.
   - Import path should be close to standard MySQL.
   - Caveat: Railway database templates are convenient, but their docs describe them as unmanaged services, so backups and recovery need explicit setup.

2. TiDB Cloud Starter
   - Lowest cost option to try first.
   - MySQL wire compatible, so the Node `mysql2` client can connect.
   - Needs import testing because it is MySQL-compatible but not identical to MySQL 5.7.
   - Requires TLS for public connections.

3. DigitalOcean Managed MySQL
   - More boring and reliable.
   - Starts at a higher monthly cost, but still reasonable and managed.
   - Better when we want conventional managed backups and fewer compatibility surprises.

## Longer-Term Production Options

1. Netlify + TiDB Cloud Starter
   - Convenience: high for the frontend, moderate for database import.
   - Cost: lowest likely starting point.
   - Deployment: GitHub deploys for web/API functions; managed MySQL-compatible database.
   - Tradeoff: test MySQL compatibility carefully before production cutover.

2. Netlify + Railway MySQL
   - Convenience: high.
   - Cost: low to moderate.
   - Deployment: keep current Netlify setup and point env vars at Railway MySQL.
   - Tradeoff: plan backups and recovery deliberately.

3. Railway app + Railway MySQL
   - Convenience: high.
   - Cost: low to moderate.
   - Deployment: easy GitHub deploys, environment variables, managed database.
   - Tradeoff: usage-based billing and fewer enterprise controls than a traditional VPS.

4. Render web service + external MySQL
   - Convenience: high for Node apps.
   - Cost: moderate if using paid always-on services.
   - Tradeoff: Render Postgres is first-class; MySQL would need an external provider.

5. DigitalOcean App Platform or Droplet + Managed MySQL
   - Convenience: moderate.
   - Cost: moderate.
   - Tradeoff: more configuration, but predictable and mature.

6. Small VPS with Node + MySQL on one server
   - Convenience: low to moderate.
   - Cost: often cheapest.
   - Tradeoff: we own server updates, backups, firewalling, monitoring, and database recovery.

7. HostGator upgraded plan
   - Convenience: low for modern app deployment based on what support told us.
   - Cost: poor value for this app.
   - Recommendation: avoid unless there is a separate reason to consolidate on HostGator.

## Rough Cost And Fit

| Option | Starting cost signal | Deployment convenience | Database fit | Recommendation |
| --- | ---: | --- | --- | --- |
| Netlify + TiDB Cloud Starter | $0+ usage-based DB | High | MySQL-compatible | Best first beta attempt |
| Netlify + Railway MySQL | Low hobby/usage tier | High | Real MySQL | Best low-friction beta |
| Netlify + DigitalOcean Managed MySQL | Higher, but predictable | High | Real managed MySQL | Best stable beta/prod DB |
| Railway app + Railway MySQL | Low to moderate | Very high | Real MySQL | Good full-stack host |
| DigitalOcean Droplet + MySQL | Low VM cost | Moderate | Real MySQL | Good if we accept server admin |
| AWS Lightsail + MySQL | Low VM cost | Moderate | Real MySQL | Good predictable VPS path |
| PlanetScale | Higher starter signal | High | MySQL-compatible | Not needed for this small app |
| HostGator Node upgrade | High relative to use | Low | Existing MySQL | Avoid |

## Provider Pages

- Netlify pricing: https://www.netlify.com/pricing/
- Netlify Functions docs: https://docs.netlify.com/functions/overview/
- Railway pricing: https://railway.com/pricing
- TiDB Cloud pricing: https://www.pingcap.com/pricing/
- DigitalOcean Managed Databases pricing: https://www.digitalocean.com/pricing/managed-databases
- DigitalOcean Droplets pricing: https://www.digitalocean.com/pricing/droplets
- Render pricing: https://render.com/pricing
- AWS Lightsail pricing: https://aws.amazon.com/lightsail/pricing/

## Migration Shape

1. Keep `pasbaaza_apacom_beta` as the beta data source until cloud DB is ready.
2. Import a sanitized/current SQL export into the chosen cloud DB.
3. Set Netlify environment variables to the cloud DB.
4. Run `npm run db:migrate` against the cloud DB.
5. Verify `/api/health`, `/api/home`, `/api/events`, status updates, and form submissions.
6. After beta feedback, take a fresh production export and repeat the import/cutover with a production cloud DB.
