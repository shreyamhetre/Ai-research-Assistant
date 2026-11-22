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

export const api = {
  titles: () => request('/fetch-titles').then((d) => d.titles),
  upload: (file, title) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    return request('/upload', { method: 'POST', body: form });
  },
  summary: (title) => post('/summary', { title }),
  mcq: (title) => post('/createMcq', { title }),
  chat: (query, title) => post('/chatbot', { query, title: title || undefined }),
};
