export const formatTime = (value) => {
  if (!value) return '—';
  const [rawHours, rawMinutes] = String(value).slice(0, 5).split(':');
  const hours = Number(rawHours);
  if (!Number.isInteger(hours) || rawMinutes === undefined) return String(value);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${rawMinutes} ${suffix}`;
};

export const formatTimeRange = (start, end) => `${formatTime(start)}–${formatTime(end)}`;
