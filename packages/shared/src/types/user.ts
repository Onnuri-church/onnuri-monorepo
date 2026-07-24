export type UserRole = "member" | "team_leader" | "admin";

export interface User {
  id: string;
  name: string;
  cellName: string | null;
  teamId: string | null;
  role: UserRole;
  createdAt: string;
}
