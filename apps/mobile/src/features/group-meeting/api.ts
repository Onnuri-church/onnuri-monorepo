import type {
  CreateGroupMeetingRequest,
  GroupMeeting,
  GroupMeetingDetail,
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
