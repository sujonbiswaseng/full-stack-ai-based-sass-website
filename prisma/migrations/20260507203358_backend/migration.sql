/*
  Warnings:

  - The `promptResetday` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "promptResetday",
ADD COLUMN     "promptResetday" TIMESTAMP(3);
