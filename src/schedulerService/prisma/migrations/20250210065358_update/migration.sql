/*
  Warnings:

  - A unique constraint covering the columns `[instanceId]` on the table `worker` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "worker_instanceId_key" ON "worker"("instanceId");
