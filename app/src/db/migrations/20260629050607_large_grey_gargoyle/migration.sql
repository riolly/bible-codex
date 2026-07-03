CREATE TABLE `reading_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`scroll_mode` text DEFAULT 'vertical' NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer
);
