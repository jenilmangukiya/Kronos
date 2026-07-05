-- CreateEnum
CREATE TYPE "PaperPositionSide" AS ENUM ('LONG', 'SHORT');

-- AlterTable
ALTER TABLE "paper_positions" ADD COLUMN     "side" "PaperPositionSide" NOT NULL DEFAULT 'LONG';
