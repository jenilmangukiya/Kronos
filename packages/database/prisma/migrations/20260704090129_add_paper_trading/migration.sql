-- CreateEnum
CREATE TYPE "PaperOrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "PaperOrderStatus" AS ENUM ('FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaperPositionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaperInstrumentType" AS ENUM ('EQUITY', 'FUTURE', 'OPTION');

-- CreateTable
CREATE TABLE "paper_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "broker_account_id" TEXT,
    "instrument_type" "PaperInstrumentType" NOT NULL,
    "token" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange_type" INTEGER NOT NULL,
    "exchange" TEXT NOT NULL,
    "side" "PaperOrderSide" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" "PaperOrderStatus" NOT NULL DEFAULT 'FILLED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_positions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "broker_account_id" TEXT,
    "instrument_type" "PaperInstrumentType" NOT NULL,
    "token" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange_type" INTEGER NOT NULL,
    "exchange" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "avg_price" DOUBLE PRECISION NOT NULL,
    "status" "PaperPositionStatus" NOT NULL DEFAULT 'OPEN',
    "realized_pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paper_orders_user_id_idx" ON "paper_orders"("user_id");

-- CreateIndex
CREATE INDEX "paper_orders_token_idx" ON "paper_orders"("token");

-- CreateIndex
CREATE INDEX "paper_positions_user_id_idx" ON "paper_positions"("user_id");

-- CreateIndex
CREATE INDEX "paper_positions_token_idx" ON "paper_positions"("token");

-- AddForeignKey
ALTER TABLE "paper_orders" ADD CONSTRAINT "paper_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_positions" ADD CONSTRAINT "paper_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
