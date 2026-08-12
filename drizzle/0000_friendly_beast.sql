CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`request_time` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`risk` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_time` text NOT NULL,
	`source` text NOT NULL,
	`event` text NOT NULL,
	`verdict` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
