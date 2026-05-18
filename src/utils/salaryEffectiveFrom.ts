/** Первое число месяца, следующего за датой `now` (календарная дата в локальной зоне). Формат YYYY-MM-DD. */
export function getFirstDayOfNextMonthDateString(now = new Date()): string {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}
