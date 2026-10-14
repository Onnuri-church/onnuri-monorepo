-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_teamId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "cellName",
DROP COLUMN "role",
DROP COLUMN "teamId";

-- DropEnum
DROP TYPE "UserRole";
