export function isValidLinkedInUrl(urlString) {
  try {
    const u = new URL(urlString);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith('linkedin.com')) return false;
    if (u.protocol !== 'https:') return false;
    return true;
  } catch (e) {
    return false;
  }
}

export function isValidHttpsUrl(urlString) {
  try {
    const u = new URL(urlString);
    return u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}
