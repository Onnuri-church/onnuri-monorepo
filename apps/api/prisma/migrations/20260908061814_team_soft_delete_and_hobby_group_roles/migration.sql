-- CreateEnum
CREATE TYPE "HobbyGroupRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "HobbyGroupMemberStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "HobbyGroupMember" ADD COLUMN     "role" "HobbyGroupRole" NOT NULL DEFAULT 'MEMBER',
ADD COLUMN     "status" "HobbyGroupMemberStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "deletedAt" TIMESTAMP(3);
