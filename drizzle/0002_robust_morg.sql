ALTER TABLE `users` ADD `role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `suspended` integer DEFAULT false NOT NULL;