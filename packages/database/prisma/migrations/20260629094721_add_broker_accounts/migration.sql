-- CreateTable
CREATE TABLE "broker_accounts" (
    "id" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "access_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broker_accounts_user_id_idx" ON "broker_accounts"("user_id");

-- AddForeignKey
ALTER TABLE "broker_accounts" ADD CONSTRAINT "broker_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
