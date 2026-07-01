/*
  Warnings:

  - You are about to drop the column `api_access_token` on the `broker_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `session_token` on the `broker_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "broker_accounts" DROP COLUMN "api_access_token",
DROP COLUMN "session_token",
ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "api_key" TEXT,
ADD COLUMN     "feed_token" TEXT,
ADD COLUMN     "refresh_token" TEXT;
