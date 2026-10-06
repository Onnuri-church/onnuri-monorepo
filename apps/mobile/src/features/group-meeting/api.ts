import type {
  CreateGroupMeetingRequest,
  GroupMeeting,
  GroupMeetingDetail,
  MyGroupMeeting,
  UpdateGroupMeetingRequest,
} from "@onnuri/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../../shared/api/client";

// 취향 소그룹 API — GET /group-meetings, /:id (HobbyGroup 실데이터).
// 쿼리 키는 목록 ["group-meetings"], 상세 ["group-meetings", id] — 접두사 하나로 같이 무효화된다.

export function fetchGroupMeetings(): Promise<GroupMeeting[]> {
  return apiClient.get<GroupMeeting[]>("/group-meetings").then((res) => res.data);
}

export function fetchGroupMeetingDetail(id: string): Promise<GroupMeetingDetail> {
  return apiClient.get<GroupMeetingDetail>(`/group-meetings/${id}`).then((res) => res.data);
}

// 내가 신청·참여 중인 모임 (마이페이지 "취향 소그룹"). 거절된 모임은 안 온다.
export function fetchMyGroupMeetings(): Promise<MyGroupMeeting[]> {
  return apiClient.get<MyGroupMeeting[]>("/group-meetings/mine").then((res) => res.data);
}

function useInvalidateGroupMeetings() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["group-meetings"] });
}

export function useCreateGroupMeeting() {
  const invalidate = useInvalidateGroupMeetings();
  return useMutation({
    mutationFn: (payload: CreateGroupMeetingRequest) =>
      apiClient.post<GroupMeetingDetail>("/group-meetings", payload).then((res) => res.data),
    onSuccess: invalidate,
  });
}

export function useUpdateGroupMeeting(meetingId: string) {
  const invalidate = useInvalidateGroupMeetings();
  return useMutation({
    mutationFn: (payload: UpdateGroupMeetingRequest) =>
      apiClient
        .patch<GroupMeetingDetail>(`/group-meetings/${meetingId}`, payload)
        .then((res) => res.data),
    onSuccess: invalidate,
  });
}

export function useDeleteGroupMeeting() {
  const invalidate = useInvalidateGroupMeetings();
  return useMutation({
    mutationFn: (meetingId: string) =>
      apiClient.delete<{ id: string }>(`/group-meetings/${meetingId}`).then((res) => res.data),
    onSuccess: invalidate,
  });
}

// 참여 신청·취소·승인은 갱신된 상세를 돌려주므로 상세 캐시를 바로 교체한다.
function useDetailMutation(meetingId: string, request: () => Promise<GroupMeetingDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (detail) => {
      queryClient.setQueryData(["group-meetings", meetingId], detail);
      void queryClient.invalidateQueries({ queryKey: ["group-meetings"], exact: true });
    },
  });
}

export function useJoinGroupMeeting(meetingId: string) {
  return useDetailMutation(meetingId, () =>
    apiClient.post<GroupMeetingDetail>(`/group-meetings/${meetingId}/join`).then((res) => res.data),
  );
}

export function useCancelGroupMeetingJoin(meetingId: string) {
  return useDetailMutation(meetingId, () =>
    apiClient
      .delete<GroupMeetingDetail>(`/group-meetings/${meetingId}/join`)
      .then((res) => res.data),
  );
}

export function useDecideGroupMeetingMember(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "APPROVED" | "REJECTED" }) =>
      apiClient
        .patch<GroupMeetingDetail>(`/group-meetings/${meetingId}/members/${userId}`, { status })
        .then((res) => res.data),
    onSuccess: (detail) => {
      queryClient.setQueryData(["group-meetings", meetingId], detail);
      void queryClient.invalidateQueries({ queryKey: ["group-meetings"], exact: true });
    },
  });
}

// 활동 사진 추가 — 승인된 참여자·소그룹장·관리자 (권한 검증은 서버).
export function useAddGroupMeetingPhotos(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageUrls: string[]) =>
      apiClient
        .post<GroupMeetingDetail>(`/group-meetings/${meetingId}/photos`, { imageUrls })
        .then((res) => res.data),
    onSuccess: (detail) => {
      queryClient.setQueryData(["group-meetings", meetingId], detail);
    },
  });
}

// 갤러리 편집의 일괄 삭제 — 삭제 API가 한 장 단위라 반복 호출한다 (한 장이라도 실패하면
// 에러로 떨어져 onError에서 안내). 마지막 응답이 최신 상세라 캐시에 그대로 넣는다.
export function useRemoveGroupMeetingPhotos(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageIds: string[]) => {
      let detail: GroupMeetingDetail | null = null;
      for (const imageId of imageIds) {
        const { data } = await apiClient.delete<GroupMeetingDetail>(
          `/group-meetings/${meetingId}/photos/${imageId}`,
        );
        detail = data;
      }
      return detail;
    },
    onSuccess: (detail) => {
      if (detail) queryClient.setQueryData(["group-meetings", meetingId], detail);
    },
    // 중간에 실패하면 일부는 이미 지워진 상태다 — 서버 값으로 다시 맞춘다.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-meetings", meetingId] });
    },
  });
}

// 댓글 삭제 — 소그룹 댓글은 게시판 공용 테이블이라 공용 API(/posts/...)를 쓴다.
// 서버 규칙상 내 댓글만 지울 수 있다 (CommentItem의 삭제 버튼도 isMine일 때만 보인다).
export function useDeleteGroupMeetingComment(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.delete(`/posts/${meetingId}/comments/${commentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-meetings", meetingId] });
    },
  });
}

// 활동 사진 삭제 — 소그룹장·관리자만 (서버가 창고 파일도 같이 지운다).
export function useRemoveGroupMeetingPhoto(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      apiClient
        .delete<GroupMeetingDetail>(`/group-meetings/${meetingId}/photos/${imageId}`)
        .then((res) => res.data),
    onSuccess: (detail) => {
      queryClient.setQueryData(["group-meetings", meetingId], detail);
    },
  });
}

// 소그룹 댓글 — 게시판 공용 /posts/:id/comments (소그룹 id = postId).
export function useAddGroupMeetingComment(meetingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/posts/${meetingId}/comments`, { content }).then((res) => res.data),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["group-meetings", meetingId] }),
  });
}
