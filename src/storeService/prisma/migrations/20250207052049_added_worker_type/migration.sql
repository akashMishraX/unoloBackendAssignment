/*
  Warnings:

  - Added the required column `type` to the `worker` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('SCHEDULER', 'EXECUTOR');

-- AlterTable
ALTER TABLE "worker" ADD COLUMN     "type" "WorkerType" NOT NULL;
