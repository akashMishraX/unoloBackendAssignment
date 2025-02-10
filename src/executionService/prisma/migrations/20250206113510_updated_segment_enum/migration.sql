/*
  Warnings:

  - Changed the type of `segment` on the `job_schedule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "segment" AS ENUM ('SEGMENT_0', 'SEGMENT_1', 'SEGMENT_2', 'SEGMENT_3', 'SEGMENT_4', 'SEGMENT_5', 'SEGMENT_6', 'SEGMENT_7', 'SEGMENT_8', 'SEGMENT_9');

-- AlterTable
ALTER TABLE "job_schedule" DROP COLUMN "segment",
ADD COLUMN     "segment" "segment" NOT NULL;
