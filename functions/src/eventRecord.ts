const categories = ['date', 'trip', 'home', 'anniversary', 'work', 'other']

// Earlier clients could interchange the category and start date when saving a plan.
export function normalizeEventRecord<T extends { start_time?: unknown; category?: unknown }>(record: T): T {
  if (typeof record.start_time !== 'string' || !categories.includes(record.start_time) ||
      typeof record.category !== 'string' || !Number.isFinite(Date.parse(record.category))) return record
  return { ...record, start_time: record.category, category: record.start_time }
}
