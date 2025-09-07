export function formatAbbrev(value: number): string {
  if (!isFinite(value as number)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1) + 'B';
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (abs >= 10_000) return (value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1) + 'K';
  return value.toLocaleString();
}


