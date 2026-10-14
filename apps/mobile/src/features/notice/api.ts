import type {
  CreateNoticeRequest,
  NoticeInfo,
  NoticeListResponse,
  UpdateNoticeRequest,
} from "@onnuri/shared";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

const NOTICE_PAGE_SIZE = 20;

// 공지 목록 — 20개씩 끊어 받아 스크롤이 끝에 닿으면 다음 쪽을 이어 붙인다 (커서 방식).
// 키가 ["notices", ...]로 시작해서 등록·수정·삭제 뒤 접두어 무효화 한 번에 전부 갱신된다.
// month("2026.10")를 안 주면 서버가 공지가 있는 가장 최근 달을 골라 주고, 응답의 months·selectedMonth로
// 연·월 토글을 그린다. 달을 바꾸는 동안은 이전 목록을 유지해 화면이 비지 않게 한다.
export function useNoticeList(month?: string) {
  return useInfiniteQuery({
    queryKey: ["notices", "list", month ?? "latest"],
    initialPageParam: undefined as string | undefined,
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam }) =>
      apiClient
        .get<NoticeListResponse>("/notices", {
          params: {
            limit: NOTICE_PAGE_SIZE,
            grouped: true,
            ...(month ? { month } : {}),
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        })
        .then((res) => res.data),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

const HOME_NOTICE_COUNT = 3;
const HOME_NOTICE_DAYS = 30;

// 홈 맨 위 줄용 — 최근 30일 이내 공지를 최신순 3건까지 받아 돌려 보여 준다.
// 30일 안에 쓴 공지가 하나도 없어도 줄이 사라지지 않게 가장 최근 1건은 남긴다 (움직이지 않음).
export function useHomeNotices() {
  return useQuery({
    queryKey: ["notices", "home"],
    queryFn: async () => {
      const { data } = await apiClient.get<NoticeListResponse>("/notices", {
        params: { limit: HOME_NOTICE_COUNT },
      });
      const cutoff = Date.now() - HOME_NOTICE_DAYS * 24 * 60 * 60 * 1000;
      const recent = data.items.filter((notice) => new Date(notice.createdAt).getTime() >= cutoff);
      return recent.length > 0 ? recent : data.items.slice(0, 1);
    },
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
