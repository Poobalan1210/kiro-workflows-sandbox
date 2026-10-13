import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// Each test gets its own server and its own fresh store.
async function startApp() {
  const server = createApp();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  return {
    url: `http://localhost:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('GET /health returns ok', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('GET /notes returns default page with 20 notes, newest first', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes`);
  assert.equal(res.status, 200);

  const { notes, page, limit, total, totalPages } = await res.json();
  assert.equal(notes.length, 20);
  assert.equal(page, 1);
  assert.equal(limit, 20);
  assert.equal(total, 45);
  assert.equal(totalPages, 3);
  for (let i = 1; i < notes.length; i++) {
    assert.ok(notes[i - 1].createdAt >= notes[i].createdAt, 'notes should be newest first');
  }
});

test('POST /notes creates a note that shows up first in the list', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Call the plumber', body: 'Tuesday after 5' }),
  });
  assert.equal(res.status, 201);
  const { note } = await res.json();
  assert.equal(note.title, 'Call the plumber');

  const list = await (await fetch(`${app.url}/notes`)).json();
  assert.equal(list.notes[0].id, note.id);
});

test('POST /notes without a title returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'no title here' }),
  });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('POST /notes with broken JSON returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"title": ',
  });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'INVALID_JSON');
});

test('POST /notes with a body over 100 KB returns 413', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Too big', body: 'x'.repeat(200 * 1024) }),
  });
  assert.equal(res.status, 413);
  const { error } = await res.json();
  assert.equal(error.code, 'PAYLOAD_TOO_LARGE');
});

test('GET /notes/:id returns the note, or 404', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const found = await fetch(`${app.url}/notes/1`);
  assert.equal(found.status, 200);
  const { note } = await found.json();
  assert.equal(note.id, 1);

  const missing = await fetch(`${app.url}/notes/9999`);
  assert.equal(missing.status, 404);
  const { error } = await missing.json();
  assert.equal(error.code, 'NOT_FOUND');
});

test('DELETE /notes/:id removes the note', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes/1`, { method: 'DELETE' });
  assert.equal(res.status, 204);

  const after = await fetch(`${app.url}/notes/1`);
  assert.equal(after.status, 404);
  await after.text();
});

test('GET /notes with pagination returns correct page and limit', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?page=2&limit=10`);
  assert.equal(res.status, 200);

  const { notes, page, limit, total, totalPages } = await res.json();
  assert.equal(notes.length, 10);
  assert.equal(page, 2);
  assert.equal(limit, 10);
  assert.equal(total, 45);
  assert.equal(totalPages, 5);
});

test('GET /notes without parameters returns default page 1 with 20 notes', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes`);
  assert.equal(res.status, 200);

  const { notes, page, limit, total, totalPages } = await res.json();
  assert.equal(notes.length, 20);
  assert.equal(page, 1);
  assert.equal(limit, 20);
  assert.equal(total, 45);
  assert.equal(totalPages, 3);
});

test('GET /notes with limit > 100 returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?limit=101`);
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('GET /notes with non-integer limit returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?limit=2.5`);
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('GET /notes with zero limit returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?limit=0`);
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('GET /notes with negative limit returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?limit=-1`);
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('GET /notes with non-integer page returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?page=1.5`);
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('GET /notes with zero page returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?page=0`);
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('GET /notes with negative page returns 400', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?page=-1`);
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'VALIDATION_ERROR');
});

test('GET /notes with page beyond last returns empty notes array', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?page=10&limit=10`);
  assert.equal(res.status, 200);

  const { notes, total, totalPages } = await res.json();
  assert.equal(notes.length, 0);
  assert.equal(total, 45);
  assert.equal(totalPages, 5);
});

test('GET /notes notes remain newest first with pagination', async (t) => {
  const app = await startApp();
  t.after(app.close);

  const res = await fetch(`${app.url}/notes?page=1&limit=10`);
  assert.equal(res.status, 200);

  const { notes } = await res.json();
  for (let i = 1; i < notes.length; i++) {
    assert.ok(notes[i - 1].createdAt >= notes[i].createdAt, 'notes should be newest first');
  }
});
