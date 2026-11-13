import { Injectable } from '@nestjs/common';

import { CellRole, TeamRole } from '../../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

// 심사 계정 이메일 — 실존할 수 없는 예약 도메인(.invalid)이라 소셜 로그인 계정과 절대 겹치지 않는다
// (소셜 로그인은 같은 이메일의 기존 유저에 연결하므로, 실제 도메인이면 남의 계정과 묶일 수 있다).
const REVIEW_EMAIL_DOMAIN = 'review.invalid';

export function reviewEmail(localPart: string) {
  return `${localPart}@${REVIEW_EMAIL_DOMAIN}`;
}

const REVIEWER_LOCAL_PART = 'app-review';
const REVIEW_TEAM_NAME = '심사용 팀';
const REVIEW_CELL_NAME = '심사용 셀';
const REVIEW_GROUP_TITLE = '[심사용] 주말 보드게임 모임';

// 심사자가 함께 볼 가짜 팀원 — 로그인할 수 없는 심사 계정이다 (소셜 연결·비밀번호 없음).
// A는 셀·팀·소그룹에 함께 있고, B는 소그룹 신청 대기 상태라 심사자가 승인·거절을 해볼 수 있다.
const REVIEW_MEMBERS = [
  { localPart: 'review-member-a', name: '심사용 팀원 A' },
  { localPart: 'review-member-b', name: '심사용 팀원 B' },
] as const;

// 스토어 심사용 데이터 준비 (SCRUM-197). 심사자가 로그인하면 팀장·셀장·소그룹장으로 기능을
// 모두 눌러볼 수 있게 심사용 팀·셀·취향소그룹을 만든다. 실제 성도에게는 보이지 않는다
// (common/review/review-scope.ts). 로그인마다 불리므로 멱등이다 — 심사자가 소속을 바꾸거나
// 신청을 처리해도 다음 로그인에서 처음 상태로 돌아온다.
@Injectable()
export class ReviewAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateReviewer() {
    const email = reviewEmail(REVIEWER_LOCAL_PART);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.withdrawnAt) {
        // 심사자가 탈퇴 기능을 눌러봤으면 되살린다 — 다음 심사에도 같은 계정을 써야 한다.
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { withdrawnAt: null, isReviewAccount: true },
        });
      }
      return existing;
    }
    return this.prisma.user.create({
      data: { email, name: '심사용 계정', isReviewAccount: true },
    });
  }

  async provision(reviewerId: string) {
    const members = await Promise.all(
      REVIEW_MEMBERS.map(({ localPart, name }) =>
        this.prisma.user.upsert({
          where: { email: reviewEmail(localPart) },
          update: { withdrawnAt: null },
          create: {
            email: reviewEmail(localPart),
            name,
            isReviewAccount: true,
          },
          select: { id: true },
        }),
      ),
    );
    const [memberA, memberB] = members;

    const team = await this.ensureTeam();
    await this.ensureTeamMember(team.id, reviewerId, TeamRole.LEADER);
    await this.ensureTeamMember(team.id, memberA.id, TeamRole.MEMBER);

    const cell = await this.ensureCell(reviewerId);
    await this.ensureCellMember(cell.id, reviewerId, CellRole.LEADER);
    await this.ensureCellMember(cell.id, memberA.id, CellRole.MEMBER);
    await this.ensureCellMember(cell.id, memberB.id, CellRole.MEMBER);

    await this.ensureHobbyGroup(reviewerId, memberA.id, memberB.id);
  }

  private async ensureTeam() {
    const team = await this.prisma.team.findUnique({
      where: { name: REVIEW_TEAM_NAME },
    });
    if (team) {
      return this.prisma.team.update({
        where: { id: team.id },
        data: { deletedAt: null, isReviewOnly: true },
      });
    }
    return this.prisma.team.create({
      data: {
        name: REVIEW_TEAM_NAME,
        tagline: '앱 심사를 위한 예시 팀이에요',
        isReviewOnly: true,
      },
    });
  }

  // 멤버십 테이블에는 (팀, 유저) 유니크가 없어 활동 중 행이 없을 때만 만든다 (개발용 로그인과 같은 방식).
  private async ensureTeamMember(
    teamId: string,
    userId: string,
    role: TeamRole,
  ) {
    const membership = await this.prisma.teamMembership.findFirst({
      where: { teamId, userId, endedAt: null },
    });
    if (membership) {
      if (membership.role !== role) {
        await this.prisma.teamMembership.update({
          where: { id: membership.id },
          data: { role },
        });
      }
      return;
    }
    await this.prisma.teamMembership.create({
      data: { teamId, userId, role, startedAt: new Date() },
    });
  }

  private async ensureCell(reviewerId: string) {
    const now = new Date();
    // 자연 만료로 끝나지 않게 넉넉히 — 심사는 업데이트마다 다시 받는다.
    const expiresAt = new Date(
      now.getFullYear() + 10,
      now.getMonth(),
      now.getDate(),
    );
    const cell = await this.prisma.cell.findFirst({
      where: { name: REVIEW_CELL_NAME, isReviewOnly: true },
    });
    if (cell) {
      return this.prisma.cell.update({
        where: { id: cell.id },
        data: { deletedAt: null, expiresAt },
      });
    }
    return this.prisma.cell.create({
      data: {
        name: REVIEW_CELL_NAME,
        startedAt: now,
        expiresAt,
        createdById: reviewerId,
        isReviewOnly: true,
      },
    });
  }

  // 셀은 한 사람당 하나라 다른 셀 소속은 끝내고 옮긴다 (CellsService.assignRole과 같은 규칙).
  private async ensureCellMember(
    cellId: string,
    userId: string,
    role: CellRole,
  ) {
    const now = new Date();
    const membership = await this.prisma.cellMembership.findFirst({
      where: { cellId, userId, endedAt: null },
    });
    if (membership) {
      if (membership.role !== role) {
        await this.prisma.cellMembership.update({
          where: { id: membership.id },
          data: { role },
        });
      }
      return;
    }
    await this.prisma.$transaction([
      this.prisma.cellMembership.updateMany({
        where: { userId, endedAt: null },
        data: { endedAt: now },
      }),
      this.prisma.cellMembership.create({
        data: { cellId, userId, role, startedAt: now },
      }),
    ]);
  }

  private async ensureHobbyGroup(
    reviewerId: string,
    memberAId: string,
    memberBId: string,
  ) {
    let group = await this.prisma.hobbyGroup.findFirst({
      where: { isReviewOnly: true, post: { title: REVIEW_GROUP_TITLE } },
      select: { postId: true },
    });
    if (!group) {
      const post = await this.prisma.post.create({
        data: {
          board: 'HOBBY_GROUP',
          authorId: reviewerId,
          title: REVIEW_GROUP_TITLE,
          content:
            '매주 토요일 오후에 함께 보드게임을 해요. 처음 오셔도 괜찮아요!',
          hobbyGroup: {
            create: {
              isReviewOnly: true,
              recruitStart: new Date(),
              meetingSchedule: '매주 토요일 오후 3시',
              place: '교회 2층 카페',
              cost: '없음',
            },
          },
        },
        select: { id: true },
      });
      group = { postId: post.id };
    }
    const postId = group.postId;
    // 모집 마감·삭제를 눌러봤어도 다시 모집중으로 — 모집 종료일은 비워 두면 계속 모집중이다.
    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: null },
    });
    await this.prisma.hobbyGroup.update({
      where: { postId },
      data: { status: 'RECRUITING', recruitEnd: null },
    });

    const rows = [
      {
        userId: reviewerId,
        role: 'LEADER' as const,
        status: 'APPROVED' as const,
      },
      {
        userId: memberAId,
        role: 'MEMBER' as const,
        status: 'APPROVED' as const,
      },
      {
        userId: memberBId,
        role: 'MEMBER' as const,
        status: 'PENDING' as const,
      },
    ];
    for (const row of rows) {
      await this.prisma.hobbyGroupMember.upsert({
        where: { postId_userId: { postId, userId: row.userId } },
        update: { role: row.role, status: row.status },
        create: { postId, ...row },
      });
    }
  }
}
