-- 리더·관리자가 탈퇴했을 때 관리자에게 보내는 알림 종류 (SCRUM-274)
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_LEFT';
