-- CreateEnum
CREATE TYPE "AiStyle" AS ENUM ('NEUTRAL', 'FLIRTY', 'PLAYFUL', 'CHALLENGING');

-- AlterTable
ALTER TABLE "PracticeMissionTemplate" ADD COLUMN     "aiStyle" "AiStyle";
