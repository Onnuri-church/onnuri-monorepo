import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../shared/types/navigation";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * 알림의 linkUrl("notice/{id}", "team-room/{id}" 등 — shared NotificationInfo.linkUrl)을 보고
 * 그 화면으로 이동한다. 알림센터의 카드와 기기 푸시 탭(SCRUM-269)이 같이 쓴다 — 둘이 따로 가면
 * 새 알림 종류를 추가할 때 한쪽만 고쳐지기 쉽다.
 *
 * 이동했으면 true, 갈 곳을 모르면(linkUrl 없음·모르는 종류) false를 돌려준다.
 */
export function openNotificationLink(
  navigation: Navigation,
  linkUrl: string | null | undefined,
  commentId?: string | null,
): boolean {
  if (!linkUrl) return false;
  const [kind, first, second] = linkUrl.split("/");
  if (!first) return false;
  // 댓글 알림이면 그 댓글로 스크롤해 잠깐 강조한다 (SCRUM-215)
  const comment = commentId ?? undefined;

  switch (kind) {
    case "notice":
      return go(navigation, "NoticeDetail", { id: first });
    case "bulletin":
      return go(navigation, "BulletinDetail", { id: first });
    case "group-room":
      return go(navigation, "GroupChat", { meetingId: first });
    case "team-room":
      return go(navigation, "ChatRoom", { roomId: first });
    case "leader-room":
      return go(navigation, "LeaderRoom", { roomId: first });
    case "cell-chat":
      return go(navigation, "CellChat", { cellId: first });
    case "follower-note":
      return go(navigation, "FollowerNoteBoard", { cellId: first, noteId: second });
    case "team-follower-note":
      return go(navigation, "TeamFollowerNoteBoard", { teamId: first, noteId: second });
    case "group-meeting":
      return go(navigation, "GroupMeetingDetail", { id: first, commentId: comment });
    case "department-activity":
      return go(navigation, "DepartmentActivityDetail", { id: first, commentId: comment });
    case "qt":
      return go(navigation, "QtBoardDetail", { id: first });
    case "sermon":
      return go(navigation, "SermonDetail", { id: first });
    case "prayer":
      return go(navigation, "PrayerBoardDetail", { id: first });
    case "cell-news":
      if (!second) return false;
      return go(navigation, "CellNewsDetail", {
        cellId: first,
        newsId: second,
        commentId: comment,
      });
    // 새 신고 (SCRUM-199) — 관리자에게만 온다
    case "admin":
      if (first === "reports") return go(navigation, "AdminReports", undefined);
      // 리더·관리자 탈퇴 알림 (SCRUM-274) — 셀장 자리가 비었으면 셀 관리, 아니면 회원 관리
      if (first === "cells") return go(navigation, "AdminCellManage", undefined);
      if (first === "members") return go(navigation, "AdminMemberList", undefined);
      return false;
    default:
      return false;
  }
}

// 이미 그 화면을 보고 있으면 다시 쌓지 않는다 — 채팅방을 보는 중에 그 방의 푸시를 누르면
// 같은 방이 위에 한 겹 더 열려서, 뒤로가기를 두 번 눌러야 나가게 된다.
function go<Name extends keyof RootStackParamList>(
  navigation: Navigation,
  name: Name,
  params: RootStackParamList[Name],
): true {
  const routes = navigation.getState()?.routes ?? [];
  const current = routes[routes.length - 1];
  if (current?.name === name && sameParams(current.params, params)) return true;
  // 화면 이름과 파라미터 짝은 위 switch에서 이미 맞췄다 — navigate의 오버로드가 제네릭 이름을
  // 풀지 못해 여기서만 타입을 넓힌다.
  (navigation.navigate as (name: string, params?: object) => void)(name, params);
  return true;
}

function sameParams(a: unknown, b: unknown): boolean {
  const left = (a ?? {}) as Record<string, unknown>;
  const right = (b ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    // 비어 있는 값(undefined)끼리는 같다고 본다 — commentId처럼 없을 수 있는 값
    if ((left[key] ?? null) !== (right[key] ?? null)) return false;
  }
  return true;
}
