import type {
  CreateNoticeRequest,
  NoticeInfo,
  NoticeListResponse,
  UpdateNoticeRequest,
} from "@onnuri/shared";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

const NOTICE_PAGE_SIZE = 20;

// 공지 목록 — 20개씩 끊어 받아 스크롤이 끝에 닿으면 다음 쪽을 이어 붙인다 (커서 방식).
// 키가 ["notices", ...]로 시작해서 등록·수정·삭제 뒤 접두어 무효화 한 번에 전부 갱신된다.
export function useNoticeList() {
  return useInfiniteQuery({
    queryKey: ["notices", "list"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient
        .get<NoticeListResponse>("/notices", {
          params: { limit: NOTICE_PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) },
        })
        .then((res) => res.data),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

// 홈 맨 위 한 줄용 — 가장 최근 공지 1건만 받는다.
export function useLatestNotice() {
  return useQuery({
    queryKey: ["notices", "latest"],
    queryFn: () =>
      apiClient
        .get<NoticeListResponse>("/notices", { params: { limit: 1 } })
        .then((res) => res.data.items[0] ?? null),
  });
}

// 상세·수정 화면용 — 목록 캐시에 기대지 않고 한 건을 직접 받는다 (알림 링크로 바로 들어와도 열린다).
export function useNotice(noticeId: string | undefined) {
  return useQuery({
    queryKey: ["notices", "detail", noticeId],
    queryFn: () => apiClient.get<NoticeInfo>(`/notices/${noticeId}`).then((res) => res.data),
    enabled: noticeId !== undefined,
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNoticeRequest) =>
      apiClient.post<NoticeInfo>("/notices", payload).then((res) => res.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notices"] }),
  });
}

export function useUpdateNotice(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateNoticeRequest) =>
      apiClient.patch<NoticeInfo>(`/notices/${noticeId}`, payload).then((res) => res.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notices"] }),
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noticeId: string) =>
      apiClient.delete(`/notices/${noticeId}`).then((res) => res.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notices"] }),
  });
}

// "2026-09-28T…" → "2026.09.28"
export function toNoticeDateLabel(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", ".");
}
