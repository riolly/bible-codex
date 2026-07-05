CREATE TABLE `reading_position` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	`book_slug` text NOT NULL,
	`chapter` integer NOT NULL,
	`verse` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reading_position_book_unique` ON `reading_position` (`book_slug`) WHERE "reading_position"."deleted_at" is null;