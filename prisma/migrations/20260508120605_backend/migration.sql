/*
  Warnings:

  - You are about to drop the column `blogId` on the `Product` table. All the data in the column will be lost.
  - Added the required column `productid` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_blogId_fkey";

-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "productid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "blogId";

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_productid_fkey" FOREIGN KEY ("productid") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
