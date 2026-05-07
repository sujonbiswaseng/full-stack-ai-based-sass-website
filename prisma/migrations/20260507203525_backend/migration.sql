/*
  Warnings:

  - You are about to drop the column `promptResetday` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "promptResetday",
ADD COLUMN     "promptResetAt" TIMESTAMP(3);
