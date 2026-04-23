const KEY = 'lavie_app_state';

export async function loadState(fallback) {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {}
  return fallback;
}

export async function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}
