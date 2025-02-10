/*
  Warnings:

  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "job_execution_history" DROP CONSTRAINT "job_execution_history_job_id_fkey";

-- DropForeignKey
ALTER TABLE "job_schedule" DROP CONSTRAINT "job_schedule_job_id_fkey";

-- DropTable
DROP TABLE "Job";

-- CreateTable
CREATE TABLE "job" (
    "job_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_recurring" BOOLEAN NOT NULL,
    "interval" TEXT,
    "max_retries" INTEGER,
    "created_time" TIMESTAMP(3) NOT NULL,
    "job_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("job_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_job_id_key" ON "job"("job_id");

-- AddForeignKey
ALTER TABLE "job_schedule" ADD CONSTRAINT "job_schedule_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution_history" ADD CONSTRAINT "job_execution_history_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;
