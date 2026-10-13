// Small helpers shared by every route.

export const MAX_BODY_BYTES = 100 * 1024;

export class BodyTooLargeError extends Error {}

export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

// Every error response uses the same shape:
// { "error": { "code": "NOT_FOUND", "message": "Note not found" } }
export function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } });
}

// Returns the parsed body, or {} when the body is empty.
// Throws BodyTooLargeError when the body is over MAX_BODY_BYTES, and a
// SyntaxError on malformed JSON. Callers turn those into a 413 or a 400.
export async function readJsonBody(req) {
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new BodyTooLargeError();
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim() === '') return {};
  return JSON.parse(raw);
}
