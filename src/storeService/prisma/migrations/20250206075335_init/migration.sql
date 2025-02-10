-- CreateTable
CREATE TABLE "Job" (
    "job_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_recurring" BOOLEAN NOT NULL,
    "interval" TEXT,
    "max_retries" INTEGER,
    "created_time" TIMESTAMP(3) NOT NULL,
    "job_name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "job_schedule" (
    "job_id" TEXT NOT NULL,
    "next_execution_time" INTEGER NOT NULL,
    "segment" INTEGER NOT NULL,

    CONSTRAINT "job_schedule_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "job_execution_history" (
    "job_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "execution_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL,
    "last_update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_execution_history_pkey" PRIMARY KEY ("job_id","worker_id")
);

-- CreateTable
CREATE TABLE "worker" (
    "worker_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "heartbeat_updated_at" TIMESTAMP(3) NOT NULL,
    "load" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "worker_pkey" PRIMARY KEY ("worker_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_job_id_key" ON "Job"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_schedule_job_id_key" ON "job_schedule"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "worker_worker_id_key" ON "worker"("worker_id");

-- AddForeignKey
ALTER TABLE "job_schedule" ADD CONSTRAINT "job_schedule_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution_history" ADD CONSTRAINT "job_execution_history_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution_history" ADD CONSTRAINT "job_execution_history_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker"("worker_id") ON DELETE CASCADE ON UPDATE CASCADE;
