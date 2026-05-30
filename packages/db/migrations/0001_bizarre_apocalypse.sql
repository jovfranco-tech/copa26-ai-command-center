CREATE TABLE `pool_picks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_name` text NOT NULL,
	`match_id` text NOT NULL,
	`home_goals` integer,
	`away_goals` integer,
	`outcome` text,
	`updated_at` text DEFAULT (current_timestamp)
);
