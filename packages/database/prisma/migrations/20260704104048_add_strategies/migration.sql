-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('STOPPED', 'RUNNING');

-- CreateEnum
CREATE TYPE "StrategyMode" AS ENUM ('PAPER', 'LIVE');

-- CreateEnum
CREATE TYPE "StrategyInstrumentType" AS ENUM ('EQUITY', 'FUTURE', 'OPTION');

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "broker_account_id" TEXT,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "instrument_type" "StrategyInstrumentType" NOT NULL,
    "mode" "StrategyMode" NOT NULL DEFAULT 'PAPER',
    "status" "StrategyStatus" NOT NULL DEFAULT 'STOPPED',
    "rules" JSONB NOT NULL,
    "trade" JSONB NOT NULL,
    "risk" JSONB,
    "last_triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_logs" (
    "id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strategies_user_id_idx" ON "strategies"("user_id");

-- CreateIndex
CREATE INDEX "strategies_status_idx" ON "strategies"("status");

-- CreateIndex
CREATE INDEX "strategy_logs_strategy_id_idx" ON "strategy_logs"("strategy_id");

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_logs" ADD CONSTRAINT "strategy_logs_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
