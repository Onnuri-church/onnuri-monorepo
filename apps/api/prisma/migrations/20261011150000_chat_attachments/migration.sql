-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "files" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "videoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

