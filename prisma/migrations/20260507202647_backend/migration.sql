/*
  Warnings:

  - You are about to drop the column `promptResetAt` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "promptResetAt",
ADD COLUMN     "promptResetday" INTEGER;
