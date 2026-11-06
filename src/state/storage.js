export function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function writeGameStorage(state, dataset) {
  localStorage.setItem('birthday-feud-state', JSON.stringify(state));
  localStorage.setItem('birthday-feud-dataset', JSON.stringify(dataset));
  localStorage.removeItem('birthday-feud-connection');
}
