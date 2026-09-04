-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'TEAM_LEADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('KAKAO', 'GOOGLE');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "CellRole" AS ENUM ('LEADER', 'SUB_LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('QR', 'MANUAL');

-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('QT_SHARE', 'CELL_NEWS', 'TEAM_ACTIVITY', 'HOBBY_GROUP', 'PRAYER');

-- CreateEnum
CREATE TYPE "PrayerCategory" AS ENUM ('PERSONAL_SPIRITUAL', 'HEALTH_DAILY', 'RELATIONSHIP_COMMUNITY', 'INTERCESSION_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "HobbyGroupStatus" AS ENUM ('RECRUITING', 'CLOSED');

-- CreateEnum
CREATE TYPE "ImageKind" AS ENUM ('POST_CONTENT', 'GALLERY', 'BULLETIN', 'HANDOUT');

-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('NOTICE', 'BANNER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOWER_NOTE', 'SERMON_UPLOAD', 'LIVE_START', 'QT_NEW', 'COMMENT', 'LIKE', 'NOTICE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cellName" TEXT,
    "teamId" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "birthDate" DATE,
    "gender" "Gender",
    "avatarUrl" TEXT,
    "intro" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "notifySermonUpload" BOOLEAN NOT NULL DEFAULT true,
    "notifyLiveWorship" BOOLEAN NOT NULL DEFAULT true,
    "notifyQtNewPost" BOOLEAN NOT NULL DEFAULT true,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "providerUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "coverImageUrl" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "startedAt" DATE NOT NULL,
    "endedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cell" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "startedAt" DATE NOT NULL,
    "expiresAt" DATE NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellMembership" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CellRole" NOT NULL DEFAULT 'MEMBER',
    "startedAt" DATE NOT NULL,
    "endedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CellMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorshipService" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "qrToken" TEXT,
    "qrClosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorshipService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorshipAttendance" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "method" "AttendanceMethod" NOT NULL DEFAULT 'QR',
    "recordedById" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorshipAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellMeeting" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CellMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellMeetingAttendance" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CellMeetingAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerNote" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "answer1" TEXT,
    "answer2" TEXT,
    "answer3" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerNoteComment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowerNoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "board" "BoardType" NOT NULL,
    "authorId" TEXT NOT NULL,
    "cellId" TEXT,
    "teamId" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "eventDate" DATE,
    "coverImageUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QtShare" (
    "postId" TEXT NOT NULL,
    "passage" TEXT,

    CONSTRAINT "QtShare_pkey" PRIMARY KEY ("postId")
);

-- CreateTable
CREATE TABLE "PrayerRequest" (
    "postId" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "category" "PrayerCategory" NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "visibleUntil" DATE NOT NULL,

    CONSTRAINT "PrayerRequest_pkey" PRIMARY KEY ("postId")
);

-- CreateTable
CREATE TABLE "HobbyGroup" (
    "postId" TEXT NOT NULL,
    "status" "HobbyGroupStatus" NOT NULL DEFAULT 'RECRUITING',
    "recruitStart" DATE,
    "recruitEnd" DATE,
    "meetingSchedule" TEXT,
    "place" TEXT,
    "cost" TEXT,

    CONSTRAINT "HobbyGroup_pkey" PRIMARY KEY ("postId")
);

-- CreateTable
CREATE TABLE "HobbyGroupMember" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HobbyGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "ImageKind" NOT NULL,
    "postId" TEXT,
    "serviceId" TEXT,
    "cellId" TEXT,
    "teamId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "takenOn" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SermonSeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "month" DATE NOT NULL,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SermonSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sermon" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "seriesId" TEXT,
    "title" TEXT NOT NULL,
    "passage" TEXT,
    "preacher" TEXT,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sermon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "type" "NoticeType" NOT NULL DEFAULT 'NOTICE',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "startsOn" DATE,
    "endsOn" DATE,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerUid_key" ON "SocialAccount"("provider", "providerUid");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_userId_idx" ON "TeamMembership"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TeamMembership_userId_idx" ON "TeamMembership"("userId");

-- CreateIndex
CREATE INDEX "CellMembership_cellId_userId_idx" ON "CellMembership"("cellId", "userId");

-- CreateIndex
CREATE INDEX "CellMembership_userId_idx" ON "CellMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorshipService_date_key" ON "WorshipService"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WorshipService_qrToken_key" ON "WorshipService"("qrToken");

-- CreateIndex
CREATE INDEX "WorshipAttendance_userId_idx" ON "WorshipAttendance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorshipAttendance_serviceId_userId_key" ON "WorshipAttendance"("serviceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CellMeeting_cellId_serviceId_key" ON "CellMeeting"("cellId", "serviceId");

-- CreateIndex
CREATE INDEX "CellMeetingAttendance_userId_idx" ON "CellMeetingAttendance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CellMeetingAttendance_meetingId_userId_key" ON "CellMeetingAttendance"("meetingId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerNote_meetingId_key" ON "FollowerNote"("meetingId");

-- CreateIndex
CREATE INDEX "FollowerNoteComment_noteId_createdAt_idx" ON "FollowerNoteComment"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_board_createdAt_idx" ON "Post"("board", "createdAt");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_cellId_idx" ON "Post"("cellId");

-- CreateIndex
CREATE INDEX "Post_teamId_idx" ON "Post"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerRequest_number_key" ON "PrayerRequest"("number");

-- CreateIndex
CREATE INDEX "HobbyGroupMember_userId_idx" ON "HobbyGroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HobbyGroupMember_postId_userId_key" ON "HobbyGroupMember"("postId", "userId");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_postId_userId_key" ON "Bookmark"("postId", "userId");

-- CreateIndex
CREATE INDEX "Image_postId_idx" ON "Image"("postId");

-- CreateIndex
CREATE INDEX "Image_serviceId_idx" ON "Image"("serviceId");

-- CreateIndex
CREATE INDEX "Image_cellId_takenOn_idx" ON "Image"("cellId", "takenOn");

-- CreateIndex
CREATE INDEX "Image_teamId_takenOn_idx" ON "Image"("teamId", "takenOn");

-- CreateIndex
CREATE UNIQUE INDEX "Sermon_serviceId_key" ON "Sermon"("serviceId");

-- CreateIndex
CREATE INDEX "Sermon_seriesId_idx" ON "Sermon"("seriesId");

-- CreateIndex
CREATE INDEX "Notice_type_createdAt_idx" ON "Notice"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMembership" ADD CONSTRAINT "CellMembership_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMembership" ADD CONSTRAINT "CellMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipAttendance" ADD CONSTRAINT "WorshipAttendance_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "WorshipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipAttendance" ADD CONSTRAINT "WorshipAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorshipAttendance" ADD CONSTRAINT "WorshipAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeeting" ADD CONSTRAINT "CellMeeting_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeeting" ADD CONSTRAINT "CellMeeting_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "WorshipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeeting" ADD CONSTRAINT "CellMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeetingAttendance" ADD CONSTRAINT "CellMeetingAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CellMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeetingAttendance" ADD CONSTRAINT "CellMeetingAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeetingAttendance" ADD CONSTRAINT "CellMeetingAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerNote" ADD CONSTRAINT "FollowerNote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CellMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerNote" ADD CONSTRAINT "FollowerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerNoteComment" ADD CONSTRAINT "FollowerNoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "FollowerNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowerNoteComment" ADD CONSTRAINT "FollowerNoteComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QtShare" ADD CONSTRAINT "QtShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HobbyGroup" ADD CONSTRAINT "HobbyGroup_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HobbyGroupMember" ADD CONSTRAINT "HobbyGroupMember_postId_fkey" FOREIGN KEY ("postId") REFERENCES "HobbyGroup"("postId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HobbyGroupMember" ADD CONSTRAINT "HobbyGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "WorshipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermon" ADD CONSTRAINT "Sermon_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "WorshipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermon" ADD CONSTRAINT "Sermon_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "SermonSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
