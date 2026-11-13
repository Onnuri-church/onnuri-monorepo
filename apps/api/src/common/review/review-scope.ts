import { AsyncLocalStorage } from 'node:async_hooks';

import type { Prisma } from '../../../generated/prisma';

// 스토어 심사용 계정 분리 (SCRUM-197).
// 심사자는 실제 운영 서버에 로그인하므로, 심사 계정이 만든 것이 실제 성도에게 보이면 안 된다.
//   - 사람·글·댓글: 실제 성도에게는 심사 계정의 것을 숨긴다. 심사 계정은 앱이 살아 있어 보이게 전부 본다.
//   - 팀·셀·취향소그룹: 심사용과 실제를 완전히 나눈다 — 심사 계정이 실제 모임에 들어가거나 신청하지 못하게.
//   - 알림: 심사 계정이 한 행동으로는 실제 성도에게 알림이 가지 않는다 (NotificationsService).
// "지금 요청한 사람이 심사 계정인가"는 요청마다 JwtStrategy가 계정을 조회할 때 여기에 적어 둔다 —
// 서비스 메서드마다 인자로 넘기지 않아도 되게. 비로그인·크론처럼 값이 없으면 실제 성도와 같이 다룬다.
interface ReviewContext {
  isReviewer: boolean;
  /** 요청한 사람 — 차단 목록 필터(visibleAuthorWhere)가 쓴다 (SCRUM-198). 비로그인이면 없다. */
  viewerId?: string;
}

export const reviewContext = new AsyncLocalStorage<ReviewContext>();

// JwtStrategy가 계정 확인 뒤에 부른다.
export function setViewer(viewerId: string, isReviewer: boolean): void {
  const store = reviewContext.getStore();
  if (!store) return;
  store.viewerId = viewerId;
  store.isReviewer = isReviewer;
}

export function isReviewViewer(): boolean {
  return reviewContext.getStore()?.isReviewer ?? false;
}

// 사람 조건 — 글·댓글의 author, 멤버 목록의 user 등에 붙인다.
export function visibleUserWhere(): Prisma.UserWhereInput {
  return isReviewViewer() ? {} : { isReviewAccount: false };
}

// 팀·셀·취향소그룹 조건 — 심사 계정은 심사용만, 실제 성도는 실제 것만.
export function groupScopeWhere(): { isReviewOnly: boolean } {
  return { isReviewOnly: isReviewViewer() };
}

// 읽기 전용 목록(관리자 화면, 부서활동 필터 칩)용 — 실제 성도·관리자에게는 심사용을 숨기고,
// 심사 계정은 전부 본다. 들어가거나 신청하는 목록에는 groupScopeWhere를 쓴다.
export function visibleGroupWhere(): { isReviewOnly?: false } {
  return isReviewViewer() ? {} : { isReviewOnly: false };
}

// 글·댓글 작성자 조건 — 심사 계정 숨김(visibleUserWhere)에 더해, 요청한 사람이 차단한 사람의 글·댓글을
// 뺀다 (SCRUM-198). 관리자 회원 목록처럼 "사람 목록"에는 쓰지 않는다 — 차단해도 같은 교회 성도다.
export function visibleAuthorWhere(): Prisma.UserWhereInput {
  const viewerId = reviewContext.getStore()?.viewerId;
  return {
    ...visibleUserWhere(),
    ...(viewerId && { blockedBy: { none: { blockerId: viewerId } } }),
  };
}
