import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminReportItem, CreateReportRequest, HandleReportRequest } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

// 신고 접수 (SCRUM-199).
export function useCreateReport() {
  return useMutation({
    mutationFn: (body: CreateReportRequest) => apiClient.post("/reports", body),
  });
}

// 관리자 신고 목록 — 처리 전(open) / 처리됨(done).
export function useAdminReports(status: "open" | "done") {
  return useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () =>
      apiClient
        .get<AdminReportItem[]>("/admin/reports", { params: { status } })
        .then((res) => res.data),
  });
}

// 숨기면 글이 내려가므로 캐시를 통째로 다시 받는다 (어느 목록에 있던 글인지 골라내지 않는다).
export function useHandleReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string } & HandleReportRequest) =>
      apiClient.patch(`/admin/reports/${id}`, { action }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
