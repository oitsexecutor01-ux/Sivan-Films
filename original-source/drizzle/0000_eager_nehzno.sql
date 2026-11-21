CREATE TABLE `studio_history` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`draft` text NOT NULL,
	`published` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	`published_at` text
);
