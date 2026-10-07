import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const dailyVisits = sqliteTable('daily_visits', {
  day: text('day').primaryKey(),
  visits: integer('visits').notNull().default(0),
});
export const visitEvents = sqliteTable('visit_events', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
}, table=>[index('visit_events_created_at').on(table.createdAt)]);
