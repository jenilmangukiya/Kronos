/*
  Warnings:

  - A unique constraint covering the columns `[user_id,broker,client_id]` on the table `broker_accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "broker_accounts_user_id_broker_client_id_key" ON "broker_accounts"("user_id", "broker", "client_id");
