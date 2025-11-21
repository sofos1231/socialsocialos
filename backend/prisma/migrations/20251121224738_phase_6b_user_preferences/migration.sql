-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttractionPreference" AS ENUM ('WOMEN', 'MEN', 'BOTH', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PreferencePath" AS ENUM ('FEMALE_PATH', 'MALE_PATH', 'DUAL_PATH', 'OTHER_PATH', 'UNKNOWN_PATH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "attractedTo" "AttractionPreference" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "preferencePath" "PreferencePath" NOT NULL DEFAULT 'UNKNOWN_PATH';
