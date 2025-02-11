-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('IDLE', 'BUSY', 'DOWN');

-- CreateEnum
CREATE TYPE "ZookeeperNodeStatus" AS ENUM ('ACTIVE', 'DOWN');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'ERROR', 'DEBUG');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('EMAIL', 'NOTIFICATION', 'CODING', 'DATA_PROCESSING', 'REPORT', 'BACKUP');

-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('SCHEDULER', 'EXECUTOR');

-- CreateTable
CREATE TABLE "job" (
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL,
    "is_recurring" BOOLEAN NOT NULL,
    "interval" TEXT,
    "max_retries" INTEGER DEFAULT 3,
    "created_time" TIMESTAMP(3) NOT NULL,
    "job_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "job_schedule" (
    "job_id" TEXT NOT NULL,
    "next_execution_time" INTEGER NOT NULL,

    CONSTRAINT "job_schedule_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "job_execution_history" (
    "job_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "execution_time" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL,
    "retry_count" INTEGER NOT NULL,
    "last_update_time" TIMESTAMP(3) NOT NULL,
    "response" JSONB,
    "error_message" TEXT,

    CONSTRAINT "job_execution_history_pkey" PRIMARY KEY ("job_id","worker_id")
);

-- CreateTable
CREATE TABLE "worker" (
    "worker_id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'local',
    "status" "WorkerStatus" NOT NULL,
    "type" "WorkerType" NOT NULL,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "load" INTEGER DEFAULT 0,
    "capacity" INTEGER DEFAULT 4,

    CONSTRAINT "worker_pkey" PRIMARY KEY ("worker_id")
);

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
CREATE UNIQUE INDEX "job_job_id_key" ON "job"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_schedule_job_id_key" ON "job_schedule"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_instanceId_key" ON "worker"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "zookeeper_node_hostname_key" ON "zookeeper_node"("hostname");

-- AddForeignKey
ALTER TABLE "job_schedule" ADD CONSTRAINT "job_schedule_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution_history" ADD CONSTRAINT "job_execution_history_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution_history" ADD CONSTRAINT "job_execution_history_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker"("worker_id") ON DELETE CASCADE ON UPDATE CASCADE;
