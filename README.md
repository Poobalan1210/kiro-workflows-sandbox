# kiro-workflows-sandbox

A small notes API for trying the [issue-to-deploy](https://github.com/Poobalan1210/kiro-workflows) Kiro workflow on a real repo. It has tests, CI, and an open issue to work on.

## Run it

Needs Node.js 20 or later. There are no dependencies to install.

```sh
npm test         # run the tests
npm start        # start the API on http://localhost:3000
npm run staging  # stand-in for a staging deploy
```

This sandbox has nowhere to deploy to, so `npm run staging` stands in for a deploy. It starts the API on a free port, checks that `/health` and `/notes` respond, and stops it.

## API

### GET /health

Returns `200` with `{ "status": "ok" }`.

### GET /notes

Returns every note, newest first.

```json
{ "notes": [{ "id": 45, "title": "Workout plan #45", "body": "", "createdAt": "2026-01-03T05:00:00.000Z" }] }
```

### POST /notes

Body: `{ "title": "Groceries", "body": "milk, eggs" }`. `title` is required. Returns `201` with `{ "note": { ... } }`. Bodies over 100 KB get a `413`.

### GET /notes/:id

Returns `{ "note": { ... } }`, or `404`.

### DELETE /notes/:id

Returns `204`, or `404`.

## Errors

Every error uses the same body:

```json
{ "error": { "code": "NOT_FOUND", "message": "Note not found" } }
```

## Try the workflow

1. Install the [issue-to-deploy recipe](https://github.com/Poobalan1210/kiro-workflows#install-it).
2. Open this folder in Kiro, trust it, and turn on Workflows in Workspace Configuration.
3. In a new chat, ask: "Run the issue-to-deploy workflow for issue 1. To deploy, run `npm run staging`."
