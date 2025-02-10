/*
  Warnings:

  - Added the required column `job_type` to the `job` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `job_execution_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `worker` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('EMAIL', 'NOTIFICATION', 'DATA_PROCESSING', 'REPORT', 'BACKUP');

-- AlterTable
ALTER TABLE "job" ADD COLUMN     "job_type" "JobType" NOT NULL;

-- AlterTable
ALTER TABLE "job_execution_history" DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL;

-- AlterTable
ALTER TABLE "worker" DROP COLUMN "status",
ADD COLUMN     "status" "WorkerStatus" NOT NULL;
