CREATE TABLE `whiteboards` (
	`id` text PRIMARY KEY NOT NULL,
	`encrypted_data` text NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
