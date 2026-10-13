import http from 'node:http';
import { createStore } from './store.js';
import { sendJson, sendError, readJsonBody, BodyTooLargeError } from './http.js';

export function createApp({ store = createStore() } = {}) {
  return http.createServer(async (req, res) => {
    try {
      await route(req, res, store);
    } catch (err) {
      console.error(err);
      if (res.headersSent) {
        res.destroy();
      } else {
        sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
      }
    }
  });
}

async function route(req, res, store) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);

  // /health
  if (parts.length === 1 && parts[0] === 'health') {
    if (req.method !== 'GET') {
      return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    }
    return sendJson(res, 200, { status: 'ok' });
  }

  if (parts[0] !== 'notes' || parts.length > 2) {
    return sendError(res, 404, 'NOT_FOUND', 'Route not found');
  }

  // /notes
  if (parts.length === 1) {
    if (req.method === 'GET') {
      return sendJson(res, 200, { notes: store.list() });
    }
    if (req.method === 'POST') {
      return createNote(req, res, store);
    }
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  // /notes/:id
  const id = Number(parts[1]);
  if (!Number.isInteger(id) || id < 1) {
    return sendError(res, 404, 'NOT_FOUND', 'Note not found');
  }

  if (req.method === 'GET') {
    const note = store.get(id);
    return note
      ? sendJson(res, 200, { note })
      : sendError(res, 404, 'NOT_FOUND', 'Note not found');
  }

  if (req.method === 'DELETE') {
    if (!store.remove(id)) {
      return sendError(res, 404, 'NOT_FOUND', 'Note not found');
    }
    res.writeHead(204);
    return res.end();
  }

  return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

async function createNote(req, res, store) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }
    return sendError(res, 400, 'INVALID_JSON', 'Request body must be valid JSON');
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Request body must be a JSON object');
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'title is required');
  }

  const note = store.create({
    title,
    body: typeof body.body === 'string' ? body.body : '',
  });
  return sendJson(res, 201, { note });
}
