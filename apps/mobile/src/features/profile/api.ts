import type {
  CellSummary,
  MeResponse,
  TeamSummary,
  UpdateMyProfileRequest,
  User,
} from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

export function fetchMe(): Promise<MeResponse> {
  return apiClient.get<MeResponse>("/users/me").then((res) => res.data);
}

export function fetchCells(): Promise<CellSummary[]> {
  return apiClient.get<CellSummary[]>("/cells").then((res) => res.data);
}

export function fetchTeams(): Promise<TeamSummary[]> {
  return apiClient.get<TeamSummary[]>("/teams").then((res) => res.data);
}

export function patchMyProfile(body: UpdateMyProfileRequest): Promise<User> {
  return apiClient.patch<User>("/users/me", body).then((res) => res.data);
}

// 프로필 사진만 따로 바꾼다 (null이면 제거) — 마이페이지 아바타 탭에서 쓴다.
export function patchMyAvatar(avatarUrl: string | null): Promise<MeResponse> {
  return apiClient.patch<MeResponse>("/users/me/avatar", { avatarUrl }).then((res) => res.data);
}
