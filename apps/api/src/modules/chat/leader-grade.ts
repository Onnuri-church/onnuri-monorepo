import type { Prisma } from '../../../generated/prisma';

// 리더 등급 = 관리자, 팀장(어느 팀이든), 셀장·부셀장(진행 중 멤버십, 삭제되지 않은 팀·셀 기준).
// 전체 리더 방은 이 등급에 해당하는 사람만 들어올 수 있다 — 강등되면 이 조건에서 빠져 방 멤버 행이
// 남아 있어도 접근이 막힌다.
export const LEADER_USER_WHERE = {
  withdrawnAt: null,
  OR: [
    { isAdmin: true },
    {
      teamMemberships: {
        some: { endedAt: null, role: 'LEADER', team: { deletedAt: null } },
      },
    },
    {
      cellMemberships: {
        some: {
          endedAt: null,
          role: { in: ['LEADER', 'SUB_LEADER'] },
          cell: { deletedAt: null },
        },
      },
    },
  ],
} satisfies Prisma.UserWhereInput;
