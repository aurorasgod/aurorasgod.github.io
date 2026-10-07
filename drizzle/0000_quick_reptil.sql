CREATE TABLE `daily_visits` (
	`day` text PRIMARY KEY NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visit_events_created_at` ON `visit_events` (`created_at`);