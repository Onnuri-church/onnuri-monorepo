-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BULLETIN';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "canManageBanner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canUploadBulletin" BOOLEAN NOT NULL DEFAULT false;
