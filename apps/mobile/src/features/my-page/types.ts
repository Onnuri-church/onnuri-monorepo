// 유저 등급 (docs/attendance-data-model.md §1 기준 4등급).
// cellLeader는 시안·팀 용어로 "팔로워"다. 팀장·셀장은 서로 독립이지만
// 마이페이지 시안은 등급당 한 variant만 정의하므로 단일 값으로 둔다 —
// 겸직(팀장+셀장) 표현이 필요해지면 백엔드 설계 확정과 함께 재검토.
export type UserRole = "member" | "teamLeader" | "cellLeader" | "admin";
