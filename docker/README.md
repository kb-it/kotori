# Running in production
First you need to create a `production.env` file containing
```
POSTGRES_PASSWORD=<generate a password for this>
POSTGRES_DB=kotori
```

Then run:
```sh
NODE_ENV=production docker compose up
```
