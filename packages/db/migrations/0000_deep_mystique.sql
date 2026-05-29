CREATE TABLE `asset_registry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`asset_type` text NOT NULL,
	`source_url` text,
	`local_path` text NOT NULL,
	`mime_type` text,
	`original_filename` text,
	`downloaded_at` text DEFAULT (current_timestamp),
	`status` text DEFAULT 'present'
);
--> statement-breakpoint
CREATE TABLE `match_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer,
	`minute` integer,
	`stoppage_time` integer,
	`team_id` integer,
	`player_id` integer,
	`event_type` text,
	`description` text,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fifa_id` text,
	`home_team_id` integer,
	`away_team_id` integer,
	`date_utc` text,
	`local_time` text,
	`venue_id` integer,
	`city` text,
	`stage` text,
	`group_name` text,
	`status` text,
	`home_score` integer,
	`away_score` integer,
	`minute` integer,
	`matchday` integer,
	`possession_home` integer,
	`shots_home` integer,
	`shots_away` integer,
	`shots_target_home` integer,
	`shots_target_away` integer,
	`match_url` text,
	FOREIGN KEY (`home_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`away_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `player_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer,
	`match_id` integer,
	`minutes` integer,
	`goals` integer,
	`assists` integer,
	`shots` integer,
	`shots_on_target` integer,
	`passes` integer,
	`saves` integer,
	`yellow_cards` integer,
	`red_cards` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fifa_id` text,
	`team_id` integer,
	`name` text NOT NULL,
	`slug` text,
	`position` text,
	`club` text,
	`age` integer,
	`shirt_number` integer,
	`photo_asset_id` text,
	`profile_url` text,
	`goals` integer DEFAULT 0,
	`assists` integer DEFAULT 0,
	`minutes` integer DEFAULT 0,
	`yellow_cards` integer DEFAULT 0,
	`red_cards` integer DEFAULT 0,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `standings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`group_name` text,
	`played` integer DEFAULT 0,
	`wins` integer DEFAULT 0,
	`draws` integer DEFAULT 0,
	`losses` integer DEFAULT 0,
	`goals_for` integer DEFAULT 0,
	`goals_against` integer DEFAULT 0,
	`goal_difference` integer DEFAULT 0,
	`points` integer DEFAULT 0,
	`rank` integer,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text DEFAULT (current_timestamp),
	`finished_at` text,
	`status` text,
	`source` text,
	`records_created` integer DEFAULT 0,
	`records_updated` integer DEFAULT 0,
	`assets_downloaded` integer DEFAULT 0,
	`errors_count` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `team_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer,
	`match_id` integer,
	`possession` integer,
	`shots` integer,
	`shots_on_target` integer,
	`passes` integer,
	`corners` integer,
	`fouls` integer,
	`yellow_cards` integer,
	`red_cards` integer,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fifa_id` text,
	`name` text NOT NULL,
	`slug` text,
	`country_code` text NOT NULL,
	`group_name` text,
	`ranking` integer,
	`flag_asset_id` text,
	`crest_asset_id` text,
	`color_a` text,
	`color_b` text,
	`confederation` text
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fifa_id` text,
	`name` text NOT NULL,
	`city` text,
	`country` text,
	`capacity` integer,
	`surface` text,
	`image_asset_id` text
);
