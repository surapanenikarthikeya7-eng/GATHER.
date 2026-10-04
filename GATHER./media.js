const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

export function mediaUrl(url) {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
  return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}
