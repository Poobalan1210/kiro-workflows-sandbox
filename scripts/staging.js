// A stand-in for a staging deploy. This sandbox has nowhere to deploy to,
// so this starts the API on a free port, checks that it responds, and
// stops it again. Exits with 1 if any check fails.

import { createApp } from '../src/app.js';

const server = createApp();
await new Promise((resolve) => server.listen(0, resolve));
const url = `http://localhost:${server.address().port}`;
console.log(`Started notes-api at ${url}`);

let ok = true;
for (const path of ['/health', '/notes']) {
  try {
    const res = await fetch(url + path);
    await res.text();
    console.log(`GET ${path} -> ${res.status}`);
    if (res.status !== 200) ok = false;
  } catch (err) {
    console.log(`GET ${path} -> failed: ${err.message}`);
    ok = false;
  }
}

await new Promise((resolve) => server.close(resolve));
console.log(ok ? 'Smoke check passed. Stopped notes-api.' : 'Smoke check failed. Stopped notes-api.');
process.exitCode = ok ? 0 : 1;
