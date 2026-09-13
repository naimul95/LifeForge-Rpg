-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('daily', 'weekly', 'specific_days', 'custom');

-- CreateEnum
CREATE TYPE "HabitLogStatus" AS ENUM ('DONE', 'NOT_DONE', 'AVOIDED', 'DID_IT', 'SKIPPED');

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "endDate" DATE,
ADD COLUMN     "frequency" "HabitFrequency" NOT NULL DEFAULT 'daily',
ADD COLUMN     "reminder" TEXT,
ADD COLUMN     "selectedDays" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "startDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "target" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN     "status" "HabitLogStatus" NOT NULL DEFAULT 'SKIPPED';
