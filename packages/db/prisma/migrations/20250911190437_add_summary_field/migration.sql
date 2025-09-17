/*
  Warnings:

  - You are about to drop the `History` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `summary` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."History" DROP CONSTRAINT "History_userId_fkey";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "summary" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."History";
