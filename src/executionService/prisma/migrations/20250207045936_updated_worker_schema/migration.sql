/*
  Warnings:

  - The values [ONLINE,OFFLINE] on the enum `WorkerStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `heartbeat_updated_at` on the `worker` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[instanceId]` on the table `worker` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `instanceId` to the `worker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WorkerStatus_new" AS ENUM ('IDLE', 'BUSY', 'DOWN');
ALTER TABLE "worker" ALTER COLUMN "status" TYPE "WorkerStatus_new" USING ("status"::text::"WorkerStatus_new");
ALTER TYPE "WorkerStatus" RENAME TO "WorkerStatus_old";
ALTER TYPE "WorkerStatus_new" RENAME TO "WorkerStatus";
DROP TYPE "WorkerStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "worker_worker_id_key";

-- AlterTable
ALTER TABLE "worker" DROP COLUMN "heartbeat_updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "instanceId" TEXT NOT NULL,
ADD COLUMN     "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "region" TEXT NOT NULL DEFAULT 'local',
ALTER COLUMN "load" DROP NOT NULL,
ALTER COLUMN "load" SET DEFAULT 0,
ALTER COLUMN "capacity" DROP NOT NULL,
ALTER COLUMN "capacity" SET DEFAULT 4;

-- CreateIndex
CREATE UNIQUE INDEX "worker_instanceId_key" ON "worker"("instanceId");
