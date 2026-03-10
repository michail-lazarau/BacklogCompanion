CREATE TABLE `achievement_cache` (
	`app_id` integer PRIMARY KEY NOT NULL,
	`cached_at` integer NOT NULL,
	`unlocked_count` integer NOT NULL,
	`total_count` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `steam_games`(`app_id`) ON UPDATE no action ON DELETE no action
);
