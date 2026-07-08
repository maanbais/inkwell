export function formatRelativeTime(isoDate: string | Date | null): string {
  if (!isoDate) return '';
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000)); // seconds

  if (diff < 60) return `just now`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
