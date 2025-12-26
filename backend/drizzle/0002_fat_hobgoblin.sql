ALTER TABLE "users" DROP CONSTRAINT "users_user_name_unique";--> statement-breakpoint
ALTER TABLE "group_members" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "created_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "receiver_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_contacts" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_contacts" ALTER COLUMN "contact_user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_name" SET DATA TYPE varchar(20);