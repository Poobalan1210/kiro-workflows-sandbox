// In-memory note storage. Good enough for now; swap for a database later.

const SAMPLE_TITLES = [
  'Weekly sync',
  'Groceries',
  'Book list',
  'Trip ideas',
  'Bug notes',
  'Gift ideas',
  'Release checklist',
  'Reading notes',
  'Workout plan',
];

const HOUR = 60 * 60 * 1000;

export function createStore({ seedCount = 45 } = {}) {
  const notes = [];
  let nextId = 1;

  function add({ title, body = '' }, createdAt = new Date().toISOString()) {
    const note = { id: nextId++, title, body, createdAt };
    notes.push(note);
    return note;
  }

  // Sample data: one note per hour, starting 1 January 2026.
  const start = Date.UTC(2026, 0, 1, 9, 0, 0);
  for (let i = 0; i < seedCount; i++) {
    const title = `${SAMPLE_TITLES[i % SAMPLE_TITLES.length]} #${i + 1}`;
    add({ title }, new Date(start + i * HOUR).toISOString());
  }

  return {
    // Newest first.
    list() {
      return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    get(id) {
      return notes.find((note) => note.id === id) ?? null;
    },

    create(fields) {
      return add(fields);
    },

    remove(id) {
      const index = notes.findIndex((note) => note.id === id);
      if (index === -1) return false;
      notes.splice(index, 1);
      return true;
    },
  };
}
