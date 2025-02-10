/*
  Warnings:

  - You are about to drop the column `segment` on the `job_schedule` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ZookeeperNodeStatus" AS ENUM ('ACTIVE', 'DOWN');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'ERROR', 'DEBUG');

-- AlterTable
ALTER TABLE "job_schedule" DROP COLUMN "segment";

-- DropEnum
DROP TYPE "segment";

-- CreateTable
CREATE TABLE "zookeeper_node" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "status" "ZookeeperNodeStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zookeeper_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_log" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zookeeper_node_hostname_key" ON "zookeeper_node"("hostname");
