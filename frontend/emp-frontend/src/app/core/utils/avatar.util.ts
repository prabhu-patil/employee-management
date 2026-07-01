import { environment } from '../../../environments/environment';

export function resolveAvatarUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}
