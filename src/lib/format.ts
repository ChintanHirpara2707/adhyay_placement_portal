export function formatCTC(ctc: number | null | undefined): string {
  if (ctc == null || Number.isNaN(Number(ctc))) return 'Not Disclosed';
  const n = Number(ctc);
  const value = n > 1000 ? n / 100000 : n;
  const str = Number.isInteger(value) ? `${value}` : `${value.toFixed(1)}`;
  return `₹${str} LPA`;
}

export function formatDeadline(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isDeadlineUrgent(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const t = new Date(deadline).getTime() - Date.now();
  return t > 0 && t <= 48 * 60 * 60 * 1000;
}

export function isDeadlinePassed(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const diff = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function getInitials(name: string | null | undefined, email?: string | null): string {
  if (name && name.trim().length > 1) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  if (email && email.length > 0) return email[0].toUpperCase();
  return 'P';
}
