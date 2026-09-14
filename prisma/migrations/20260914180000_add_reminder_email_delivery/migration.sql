ALTER TABLE "Reminder" ADD COLUMN "emailSentAt" TIMESTAMP(3);
ALTER TABLE "Reminder" ADD COLUMN "emailSendingAt" TIMESTAMP(3);
CREATE INDEX "Reminder_emailSentAt_emailSendingAt_remindAt_idx" ON "Reminder"("emailSentAt", "emailSendingAt", "remindAt");