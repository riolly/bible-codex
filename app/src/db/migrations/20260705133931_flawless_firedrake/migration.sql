CREATE TABLE `layout_override` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	`preset_id` text NOT NULL,
	`scope_kind` text NOT NULL,
	`scope_value` text NOT NULL,
	`font_family` text,
	`font_size` real,
	`line_height` real,
	`margin` real,
	`paragraph_spacing` real,
	`indent_step` real,
	`align` text,
	`measure` real,
	`rail_width` real
);
--> statement-breakpoint
CREATE TABLE `layout_preset` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`font_family` text,
	`font_size` real,
	`line_height` real,
	`margin` real,
	`paragraph_spacing` real,
	`indent_step` real,
	`align` text,
	`measure` real,
	`rail_width` real
);
--> statement-breakpoint
CREATE TABLE `__new_reading_settings` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	`theme` text DEFAULT 'light' NOT NULL,
	`active_preset_id` text
);
--> statement-breakpoint
INSERT INTO `__new_reading_settings`("id", "created_at", "updated_at", "deleted_at", "theme", "active_preset_id") SELECT "id", (unixepoch()), "updated_at", "deleted_at", "theme", NULL FROM `reading_settings`;--> statement-breakpoint
DROP TABLE `reading_settings`;--> statement-breakpoint
ALTER TABLE `__new_reading_settings` RENAME TO `reading_settings`;--> statement-breakpoint
CREATE UNIQUE INDEX `layout_override_scope_unique` ON `layout_override` (`preset_id`,`scope_kind`,`scope_value`) WHERE "layout_override"."deleted_at" is null;