import type { CreateNoticeRequest, NoticeInfo } from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 공지 수가 적어 목록이 전체 필드를 내려준다 — 상세 화면은 이 캐시에서 찾는다 (서버 계약 참고).
export function useNotices() {
  return useQuery({
    queryKey: ["notices"],
    queryFn: () => apiClient.get<NoticeInfo[]>("/notices").then((res) => res.data),
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
