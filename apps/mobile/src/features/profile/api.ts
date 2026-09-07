import type { CellSummary, TeamSummary, UpdateMyProfileRequest, User } from "@onnuri/shared";

import { apiClient } from "../../shared/api/client";

export function fetchCells(): Promise<CellSummary[]> {
  return apiClient.get<CellSummary[]>("/cells").then((res) => res.data);
}

export function fetchTeams(): Promise<TeamSummary[]> {
  return apiClient.get<TeamSummary[]>("/teams").then((res) => res.data);
}

export function patchMyProfile(body: UpdateMyProfileRequest): Promise<User> {
  return apiClient.patch<User>("/users/me", body).then((res) => res.data);
}
