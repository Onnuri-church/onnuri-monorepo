import type {
  CellAttendanceResponse,
  CellDetailResponse,
  CellGalleryMonth,
  CellNewsDetail,
  CellNewsListItem,
  CellRole,
  CellSummary,
  CreateCellNewsRequest,
  CreateFollowerNoteRequest,
  FollowerNoteInfo,
  PostComment,
  SaveCellAttendanceRequest,
} from "@onnuri/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";
import { fetchCells } from "../profile/api";
import type { CellMemberRole } from "./cellDetail";

export function fetchCellDetail(cellId: string): Promise<CellDetailResponse> {
  return apiClient.get<CellDetailResponse>(`/cells/${cellId}`).then((res) => res.data);
}

// 전체 셀 목록 — 프로필 설정 선택지와 같은 GET /cells라 쿼리 키도 공유한다 (한 번 받으면 둘 다 씀).
export function useCells() {
  return useQuery({ queryKey: ["cells"], queryFn: fetchCells });
}

// 헤더 제목처럼 셀 하나의 요약만 필요한 화면용 — 목록 캐시에서 찾는다 (별도 요청 없음).
export function useCell(cellId: string): CellSummary | undefined {
  const { data } = useCells();
  return data?.find((cell) => cell.id === cellId);
}

// 개별 셀 페이지(구성원 탭·셀원 관리·출석 명단)용 상세 조회.
export function useCellDetail(cellId: string) {
  return useQuery({ queryKey: ["cells", cellId], queryFn: () => fetchCellDetail(cellId) });
}

// 서버 enum(CellRole) → 셀 화면들의 표시 역할. 부셀장은 셀장과 동일 권한 — 표시만 구분 (docs/erd.md).
export function toCellMemberRole(role: CellRole): CellMemberRole {
  return role === "LEADER" ? "leader" : role === "SUB_LEADER" ? "viceLeader" : "member";
}

// ── 셀 소식 (게시판 Post API) ────────────────────────────────────────────

export function useCellNews(cellId: string) {
  return useQuery({
    queryKey: ["cell-news", cellId],
    queryFn: () =>
      apiClient
        .get<CellNewsListItem[]>("/posts/cell-news", { params: { cellId } })
        .then((res) => res.data),
  });
}

export function useCellNewsDetail(newsId: string) {
  return useQuery({
    queryKey: ["cell-news-detail", newsId],
    queryFn: () =>
      apiClient.get<CellNewsDetail>(`/posts/cell-news/${newsId}`).then((res) => res.data),
  });
}

export function useCreateCellNews(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<CreateCellNewsRequest, "cellId">) =>
      apiClient
        .post<CellNewsDetail>("/posts/cell-news", { cellId, ...payload })
        .then((res) => res.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["cell-news", cellId] }),
  });
}

export function useDeleteCellNews(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newsId: string) =>
      apiClient.delete<{ id: string }>(`/posts/cell-news/${newsId}`).then((res) => res.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["cell-news", cellId] }),
  });
}

export function useAddCellNewsComment(newsId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient
        .post<PostComment>(`/posts/${newsId}/comments`, { content })
        .then((res) => res.data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["cell-news-detail", newsId] }),
  });
}

// ── 갤러리 (직접 업로드 + 소식 사진 자동 포함 — 서버 계약) ─────────────────
// 쓰기 응답이 갱신된 전체 목록이라 캐시를 바로 교체한다.

export function useCellGallery(cellId: string) {
  return useQuery({
    queryKey: ["cell-gallery", cellId],
    queryFn: () =>
      apiClient
        .get<CellGalleryMonth[]>(`/cells/${cellId}/gallery`)
        .then((res) => res.data),
  });
}

export function useAddGalleryPhoto(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      apiClient
        .post<CellGalleryMonth[]>(`/cells/${cellId}/gallery`, { url })
        .then((res) => res.data),
    onSuccess: (months) => queryClient.setQueryData(["cell-gallery", cellId], months),
  });
}

export function useRemoveGalleryPhotos(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) =>
      apiClient
        .delete<CellGalleryMonth[]>(`/cells/${cellId}/gallery`, { data: { imageIds } })
        .then((res) => res.data),
    onSuccess: (months) => queryClient.setQueryData(["cell-gallery", cellId], months),
  });
}

// ── 출석 관리 ───────────────────────────────────────────────────────────

export function useCellAttendance(cellId: string, date: string) {
  return useQuery({
    queryKey: ["cell-attendance", cellId, date],
    queryFn: () =>
      apiClient
        .get<CellAttendanceResponse>(`/cells/${cellId}/attendance`, { params: { date } })
        .then((res) => res.data),
  });
}

// 저장 응답이 갱신된 그 날짜 상태라 invalidate 대신 캐시를 바로 교체한다.
export function useSaveCellAttendance(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveCellAttendanceRequest) =>
      apiClient
        .put<CellAttendanceResponse>(`/cells/${cellId}/attendance`, payload)
        .then((res) => res.data),
    onSuccess: (response) =>
      queryClient.setQueryData(["cell-attendance", cellId, response.date], response),
  });
}

// ── 팔로워 노트 (셀 케어 기록 API) ───────────────────────────────────────
// 쓰기 요청들이 전부 갱신된 목록을 응답으로 돌려주므로(서버 계약) invalidate 대신
// setQueryData로 바로 캐시를 바꾼다 — 왕복 한 번이 줄고 화면이 즉시 반영된다.

export function useFollowerNotes(cellId: string) {
  return useQuery({
    queryKey: ["follower-notes", cellId],
    queryFn: () =>
      apiClient
        .get<FollowerNoteInfo[]>(`/cells/${cellId}/follower-notes`)
        .then((res) => res.data),
  });
}

export function useCreateFollowerNote(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFollowerNoteRequest) =>
      apiClient
        .post<FollowerNoteInfo[]>(`/cells/${cellId}/follower-notes`, payload)
        .then((res) => res.data),
    onSuccess: (notes) => queryClient.setQueryData(["follower-notes", cellId], notes),
  });
}

export function useDeleteFollowerNote(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      apiClient
        .delete<{ id: string }>(`/cells/${cellId}/follower-notes/${noteId}`)
        .then((res) => res.data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["follower-notes", cellId] }),
  });
}

export function useAddFollowerNoteComment(cellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      apiClient
        .post<FollowerNoteInfo[]>(`/cells/${cellId}/follower-notes/${noteId}/comments`, {
          content,
        })
        .then((res) => res.data),
    onSuccess: (notes) => queryClient.setQueryData(["follower-notes", cellId], notes),
  });
}

// 소식 좋아요 — 큐티와 같은 공용 /posts/:id/likes. 즉각 반응해야 해서 상세 캐시를 먼저
// 고치고(optimistic), 실패하면 되돌린 뒤 서버 값으로 다시 맞춘다 (useToggleQtLike와 같은 이유).
export function useToggleCellNewsLike(newsId: string) {
  const queryClient = useQueryClient();
  const detailKey = ["cell-news-detail", newsId];

  return useMutation({
    mutationFn: (likedByMe: boolean) =>
      likedByMe
        ? apiClient.delete(`/posts/${newsId}/likes`)
        : apiClient.post(`/posts/${newsId}/likes`),
    onMutate: async (likedByMe) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<CellNewsDetail>(detailKey);
      queryClient.setQueryData<CellNewsDetail>(
        detailKey,
        (old) =>
          old && {
            ...old,
            likedByMe: !likedByMe,
            likeCount: old.likeCount + (likedByMe ? -1 : 1),
          },
      );
      return { previous };
    },
    onError: (_error, _likedByMe, context) => {
      queryClient.setQueryData(detailKey, context?.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: detailKey }),
  });
}
