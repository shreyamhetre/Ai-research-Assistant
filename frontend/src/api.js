const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const post = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const q = encodeURIComponent;

/** The stored PDF, optionally opened at a page. */
export const pdfUrl = (title, page) => `${BASE}/paper-file?title=${q(title)}${page ? `#page=${page}` : ''}`;

export const api = {
  health: () => request('/health'),
  papers: () => request('/papers').then((d) => d.papers),
  upload: (file, title) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    return request('/upload', { method: 'POST', body: form });
  },
  deletePaper: (title) => request(`/papers?title=${q(title)}`, { method: 'DELETE' }),
  summary: (title, refresh = false) => post('/summary', { title, refresh }),
  mcq: (title) => post('/createMcq', { title }),
  dueCards: (title) => request(`/review/due${title ? `?title=${q(title)}` : ''}`),
  review: (id, correct) => post('/review', { id, correct }),
  chat: (query, title, history) => post('/chatbot', { query, title: title || undefined, history }),
  compare: (titles, topic) => post('/compare', { titles, topic }),
};
