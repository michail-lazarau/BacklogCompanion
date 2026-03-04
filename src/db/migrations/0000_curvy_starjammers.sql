CREATE TABLE `steam_games` (
	`app_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`playtime_forever` integer DEFAULT 0 NOT NULL,
	`playtime_2weeks` integer,
	`rtime_last_played` integer,
	`img_icon_url` text,
	`header_image` text,
	`hltb_main` real,
	`hltb_extra` real,
	`hltb_complete` real,
	`hltb_cached_at` integer,
	`last_synced_at` integer NOT NULL
);
