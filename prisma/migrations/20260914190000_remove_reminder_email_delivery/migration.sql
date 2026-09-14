DROP INDEX IF EXISTS "Reminder_emailSentAt_emailSendingAt_remindAt_idx";
ALTER TABLE "Reminder" DROP COLUMN IF EXISTS "emailSentAt";
ALTER TABLE "Reminder" DROP COLUMN IF EXISTS "emailSendingAt";