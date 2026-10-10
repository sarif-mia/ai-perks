CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_kind` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_workspace_time` ON `events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `records_workspace_kind` ON `records` (`workspace_id`,`kind`);--> statement-breakpoint
CREATE TABLE `webhook_receipts` (
	`external_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`owner_name` text NOT NULL,
	`currency` text DEFAULT 'BDT' NOT NULL,
	`language` text DEFAULT 'Auto-detect' NOT NULL,
	`agent_enabled` integer DEFAULT false NOT NULL,
	`dark_mode` integer DEFAULT false NOT NULL,
	`sample_imported` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_owner_id_unique` ON `workspaces` (`owner_id`);