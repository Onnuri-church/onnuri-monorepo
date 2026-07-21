export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function isSunday(date: Date = new Date()): boolean {
  return date.getDay() === 0;
}
