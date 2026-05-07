/*
  Warnings:

  - You are about to drop the column `categoryid` on the `Product` table. All the data in the column will be lost.
  - Added the required column `category_name` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryid_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryid",
ADD COLUMN     "category_name" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_name_fkey" FOREIGN KEY ("category_name") REFERENCES "categories"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
