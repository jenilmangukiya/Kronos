/*
  Warnings:

  - You are about to drop the column `access_token` on the `broker_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "broker_accounts" DROP COLUMN "access_token",
ADD COLUMN     "api_access_token" TEXT,
ADD COLUMN     "session_token" TEXT;
