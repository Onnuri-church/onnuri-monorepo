import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminMemberDetail,
  AdminMemberRole,
  AdminMemberSummary,
  CellRole,
  MeResponse,
  MyStatsResponse,
  NotificationSettings,
  TeamRole,
  User,
} from '@onnuri/shared';

import type { Prisma } from '../../../generated/prisma';
import { kstToday, toDateLabel, toKstDate } from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { UpdateAdminMemberDto } from './dto/update-admin-member.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

// 탈퇴 계정의 이메일 — 실존할 수 없는 예약 도메인(.invalid)이라 누구의 이메일과도 겹치지 않는다.
export function withdrawnEmail(userId: string): string {
  return `withdrawn-${userId}@withdrawn.invalid`;
}

// 탈퇴 후 프로필을 보관하는 기간 (2026-09-08 확정: 30일 후 파기).
const WITHDRAWN_PROFILE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// 탈퇴 후 이름(출석·글·댓글의 작성자 표시)을 남겨 두는 기간 — 지나면 익명 처리한다
// (2026-11-10 변경: 기명 무기한 보존 → 1년 후 익명. 출석 수 등 통계는 그대로 남는다).
const WITHDRAWN_NAME_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
export const WITHDRAWN_DISPLAY_NAME = '탈퇴한 회원';

// 지금 시행 중인 개인정보처리방침의 버전 — 방침 내용이 바뀌면 올린다. 동의한 버전이 이것과
// 다르면 privacyConsented가 false가 되어 앱이 동의 화면을 다시 띄운다.
// 필수 동의(서비스 이용약관 + 개인정보 수집·이용)의 버전 — 앱 동의 화면은 두 항목을 모두 체크해야
// 보내므로 한 버전으로 함께 기록한다 (SCRUM-184). 약관·방침을 바꿔 다시 동의받으려면 올린다.
export const PRIVACY_POLICY_VERSION = '2026-11';

// 가입할 수 있는 최소 나이 (처리방침 "만 14세 미만 아동은 가입을 받지 않습니다").
const MIN_SIGNUP_AGE = 14;

// 생년월일(YYYY-MM-DD)과 오늘(한국 날짜) 기준 만 나이.
function ageOn(birthYmd: string, todayYmd: string): number {
  const [by, bm, bd] = birthYmd.split('-').map(Number);
  const [ty, tm, td] = todayYmd.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  // 응답 모양은 @onnuri/shared의 User 계약을 따른다 — 모바일이 이 타입 그대로 소비한다.
  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        birthDate: true,
        gender: true,
        phone: true,
        avatarUrl: true,
        intro: true,
        isAdmin: true,
        createdAt: true,
        privacyConsentVersion: true,
        sensitiveConsentAt: true,
      },
    });
    if (!user) return null;

    const { privacyConsentVersion, sensitiveConsentAt, ...rest } = user;
    return {
      ...rest,
      privacyConsented: privacyConsentVersion === PRIVACY_POLICY_VERSION,
      sensitiveConsented: sensitiveConsentAt !== null,
      // 계약: birthDate는 YYYY-MM-DD (나이는 클라이언트가 계산), createdAt은 ISO 문자열
      birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
      createdAt: user.createdAt.toISOString(),
      // 프로필 설정 필수 3항목을 마쳤는지 — 모바일의 온보딩 분기 기준인 계산 필드 (저장 안 함)
      profileCompleted:
        user.birthDate !== null && user.gender !== null && user.phone !== null,
    };
  }

  // GET/PATCH /users/me 응답 — findById에 진행 중(endedAt 없음)인 소속 멤버십을 붙인다.
  // soft delete된 셀/팀은 소속 없음으로 취급한다 (기록은 남지만 화면에 현재 소속으로 안 보여줌).
  async findMe(id: string): Promise<MeResponse | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const [cellMembership, teamMemberships, grantedTeam] = await Promise.all([
      // 활동기간이 끝난 셀은 소속 종료 작업(CellExpiryService)이 돌기 전이라도 현재 소속으로
      // 치지 않는다 — 셀 목록(/cells)과 같은 기준이어야 마이페이지와 셀 탭이 같은 셀을 본다.
      this.prisma.cellMembership.findFirst({
        where: {
          userId: id,
          endedAt: null,
          cell: { deletedAt: null, expiresAt: { gte: kstToday() } },
        },
        select: { role: true, cell: { select: { id: true, name: true } } },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.teamMembership.findMany({
        where: { userId: id, endedAt: null, team: { deletedAt: null } },
        select: { role: true, team: { select: { id: true, name: true } } },
        orderBy: { startedAt: 'asc' },
      }),
      // 소속 팀 중 콘텐츠 업로드 권한이 켜진 팀 — 앱이 주보 등록·배너 관리 진입점을 띄우는 기준.
      this.prisma.team.findMany({
        where: {
          deletedAt: null,
          memberships: { some: { userId: id, endedAt: null } },
          OR: [{ canUploadBulletin: true }, { canManageBanner: true }],
        },
        select: { canUploadBulletin: true, canManageBanner: true },
      }),
    ]);
    const teams = teamMemberships.map((membership) => ({
      ...membership.team,
      role: membership.role,
    }));

    return {
      ...user,
      cell: cellMembership
        ? { ...cellMembership.cell, role: cellMembership.role }
        : null,
      team: teams[0] ?? null,
      teams,
      canUploadBulletin:
        user.isAdmin || grantedTeam.some((team) => team.canUploadBulletin),
      canManageBanner:
        user.isAdmin || grantedTeam.some((team) => team.canManageBanner),
      // 전체 리더 방 진입 — 관리자, 팀장(어느 팀이든), 셀장·부셀장 (chat/leader-grade.ts와 같은 기준)
      canUseLeaderRooms:
        user.isAdmin ||
        teams.some((team) => team.role === 'LEADER') ||
        cellMembership?.role === 'LEADER' ||
        cellMembership?.role === 'SUB_LEADER',
    };
  }

  // 전체 회원 목록 (관리자 전용) — 회원 관리 목록과 셀 생성/편집의 셀장·부셀장 선택지가 쓴다.
  // 탈퇴 회원은 제외. 뱃지는 관리자 > 팀장 > 셀장(부셀장 포함) 우선순위로 하나만 단다.
  async findAllForAdmin(): Promise<AdminMemberSummary[]> {
    const users = await this.prisma.user.findMany({
      where: { withdrawnAt: null },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        isAdmin: true,
        cellMemberships: {
          where: { endedAt: null, cell: { deletedAt: null } },
          select: { role: true, cell: { select: { name: true } } },
        },
        teamMemberships: {
          where: { endedAt: null, team: { deletedAt: null } },
          select: { role: true, team: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((user) => {
      const cell = user.cellMemberships[0] ?? null;
      const teamNames = user.teamMemberships.map(
        (membership) => membership.team.name,
      );
      const isTeamLeader = user.teamMemberships.some(
        (membership) => membership.role === 'LEADER',
      );
      return {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        cellName: cell?.cell.name ?? null,
        // 여러 팀이면 이름을 쉼표로 이어 보여준다 — 목록·검색이 문자열 하나만 다룬다.
        teamName: teamNames.length > 0 ? teamNames.join(', ') : null,
        badge: user.isAdmin
          ? ('admin' as const)
          : isTeamLeader
            ? ('teamLeader' as const)
            : cell && cell.role !== 'MEMBER'
              ? ('cellLeader' as const)
              : null,
      };
    });
  }

  // 회원 상세 (관리자 전용) — 상세 화면의 표시 문구와 편집 화면의 프리필 원본을 같이 내려준다.
  async findDetailForAdmin(id: string): Promise<AdminMemberDetail> {
    const user = await this.prisma.user.findFirst({
      where: { id, withdrawnAt: null },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        birthDate: true,
        gender: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        cellMemberships: {
          where: { endedAt: null, cell: { deletedAt: null } },
          select: { role: true, cell: { select: { id: true, name: true } } },
        },
        teamMemberships: {
          where: { endedAt: null, team: { deletedAt: null } },
          select: { role: true, team: { select: { id: true, name: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.');

    const cell = user.cellMemberships[0] ?? null;
    const teams = user.teamMemberships.map((membership) => ({
      id: membership.team.id,
      name: membership.team.name,
      role: membership.role,
    }));
    const isTeamLeader = teams.some((team) => team.role === 'LEADER');
    const isCellLeader = cell !== null && cell.role !== 'MEMBER';
    // 등급 표시는 관리자 > 팀장 > 팔로워 > 일반 우선순위 (겸직 가능하지만 뱃지·권한 행은 하나).
    const role: AdminMemberRole = isTeamLeader
      ? 'TEAM_LEADER'
      : isCellLeader
        ? 'CELL_LEADER'
        : 'GENERAL';

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      birthDateLabel: user.birthDate ? toDateLabel(user.birthDate) : null,
      birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
      gender: user.gender,
      genderLabel: user.gender
        ? user.gender === 'MALE'
          ? '남성'
          : '여성'
        : null,
      phone: user.phone,
      cell: cell ? { id: cell.cell.id, name: cell.cell.name } : null,
      team: teams[0] ? { id: teams[0].id, name: teams[0].name } : null,
      teams,
      role,
      roleLabel: user.isAdmin
        ? '관리자'
        : isTeamLeader
          ? '팀장'
          : isCellLeader
            ? '팔로워'
            : '일반',
      badge: user.isAdmin
        ? 'admin'
        : isTeamLeader
          ? 'teamLeader'
          : isCellLeader
            ? 'cellLeader'
            : null,
      joinedAtLabel: toDateLabel(toKstDate(user.createdAt)),
    };
  }

  // 회원 편집 (관리자 전용) — 보낸 필드만 반영. 권한(role)은 등급 컬럼이 아니라 소속
  // 멤버십의 역할로 반영한다: 단일 선택 UI라 고른 쪽만 리더가 되고 다른 쪽 리더 역할은
  // 내려간다. 관리자(isAdmin) 지정은 앱 대상에서 제외 (2026-09-21 확정).
  async updateByAdmin(
    id: string,
    dto: UpdateAdminMemberDto,
  ): Promise<AdminMemberDetail> {
    const target = await this.prisma.user.findFirst({
      where: { id, withdrawnAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('회원을 찾을 수 없습니다.');

    await this.prisma.$transaction(async (tx) => {
      if (dto.cellId) {
        const cell = await tx.cell.findFirst({
          where: { id: dto.cellId, deletedAt: null },
          select: { id: true },
        });
        if (!cell) throw new BadRequestException('존재하지 않는 셀입니다.');
      }
      // teamIds(여러 팀)가 teamId(하나)보다 우선한다 — 이전 앱 버전은 teamId만 보낸다.
      const nextTeamIds =
        dto.teamIds !== undefined
          ? dto.teamIds
          : dto.teamId === undefined
            ? undefined
            : dto.teamId === null
              ? []
              : null; // 단일 teamId 지정 — 아래에서 syncTeamMembership으로 처리
      const teamIdsToCheck = dto.teamIds ?? (dto.teamId ? [dto.teamId] : []);
      if (teamIdsToCheck.length > 0) {
        const found = await tx.team.count({
          where: { id: { in: teamIdsToCheck }, deletedAt: null },
        });
        if (found !== teamIdsToCheck.length) {
          throw new BadRequestException('존재하지 않는 팀입니다.');
        }
      }

      await tx.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.birthDate !== undefined && {
            birthDate: new Date(dto.birthDate),
          }),
          ...(dto.gender !== undefined && { gender: dto.gender }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
        },
      });

      if (dto.cellId !== undefined) {
        await this.syncCellMembership(tx, id, dto.cellId);
      }
      if (Array.isArray(nextTeamIds)) {
        await this.syncTeamMemberships(tx, id, nextTeamIds);
      } else if (dto.teamId !== undefined) {
        await this.syncTeamMembership(tx, id, dto.teamId);
      }
      if (dto.role !== undefined) {
        await this.applyAdminRole(tx, id, dto.role, dto.leaderTeamId);
      }
    });

    return this.findDetailForAdmin(id);
  }

  // 회원 삭제 (관리자 전용) — 본인 탈퇴와 같은 처리(withdrawOps). 이후 프로필 파기(30일)·
  // 이름 익명 처리(1년)는 WithdrawnProfilePurgeService 소관.
  async withdrawByAdmin(id: string): Promise<{ id: string }> {
    const target = await this.prisma.user.findFirst({
      where: { id, withdrawnAt: null },
      select: { id: true, isAdmin: true },
    });
    if (!target) throw new NotFoundException('회원을 찾을 수 없습니다.');
    if (target.isAdmin) {
      throw new BadRequestException('관리자 계정은 여기서 삭제할 수 없습니다.');
    }

    await this.prisma.$transaction(this.withdrawOps(id, new Date()));
    return { id };
  }

  // 탈퇴 처리 (본인·관리자 공통). 탈퇴한 사람이 같은 카카오·구글 계정으로 다시 로그인하면
  // 예전 계정이 살아나지 않고 새로 가입되게 한다 — 로그인 수단 연결을 끊고, 이메일은 바로
  // 예약 도메인으로 바꾼다 (이메일이 유니크라 원래 값이 남아 있으면 같은 이메일로 새로 가입할
  // 수 없고, 로그인이 이메일로 예전 계정을 다시 찾아 연결해 버린다). 세션·푸시 토큰도 지워
  // 탈퇴 즉시 로그아웃되게 한다. 나머지 프로필(생년월일·성별·연락처·사진·소개)은 30일 뒤,
  // 이름은 1년 뒤 배치가 정리한다 (보관 정책은 docs/erd.md).
  private withdrawOps(userId: string, now: Date) {
    return [
      this.prisma.user.update({
        where: { id: userId },
        data: { withdrawnAt: now, email: withdrawnEmail(userId) },
      }),
      this.prisma.socialAccount.deleteMany({ where: { userId } }),
      this.prisma.cellMembership.updateMany({
        where: { userId, endedAt: null },
        data: { endedAt: now },
      }),
      this.prisma.teamMembership.updateMany({
        where: { userId, endedAt: null },
        data: { endedAt: now },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.pushToken.deleteMany({ where: { userId } }),
    ];
  }

  // 이 변경 전에 탈퇴한 계정은 로그인 수단과 원래 이메일이 남아 있다 — 그 사람이 다시 로그인하면
  // 로그인 직전에 여기서 연결을 끊어 새 계정으로 가입되게 한다 (AuthService.findOrCreateUser).
  async detachWithdrawn(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { email: withdrawnEmail(userId) },
      }),
      this.prisma.socialAccount.deleteMany({ where: { userId } }),
    ]);
  }

  // 탈퇴 30일이 지난 계정의 프로필 파기 — 이름은 1년까지 남긴다 (anonymizeWithdrawnNames).
  // 사진 파일은 창고에서도 지운다 (실패해도 deleteByUrl이 경고만 남긴다).
  // 탈퇴 1년이 지난 계정의 이름을 익명으로 바꾼다 — 출석·글·댓글은 남지만 누구 것인지
  // 알 수 없게 된다. 이미 익명인 계정은 건드리지 않는다.
  async anonymizeWithdrawnNames(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - WITHDRAWN_NAME_RETENTION_MS);
    const result = await this.prisma.user.updateMany({
      where: {
        withdrawnAt: { lte: cutoff },
        name: { not: WITHDRAWN_DISPLAY_NAME },
      },
      data: { name: WITHDRAWN_DISPLAY_NAME },
    });
    return result.count;
  }

  async purgeWithdrawnProfiles(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - WITHDRAWN_PROFILE_RETENTION_MS);
    const targets = await this.prisma.user.findMany({
      where: {
        withdrawnAt: { lte: cutoff },
        OR: [
          { birthDate: { not: null } },
          { gender: { not: null } },
          { phone: { not: null } },
          { avatarUrl: { not: null } },
          { intro: { not: null } },
        ],
      },
      select: { id: true, avatarUrl: true },
    });
    for (const target of targets) {
      await this.prisma.user.update({
        where: { id: target.id },
        data: {
          birthDate: null,
          gender: null,
          phone: null,
          avatarUrl: null,
          intro: null,
        },
      });
      if (target.avatarUrl)
        await this.uploadsService.deleteByUrl(target.avatarUrl);
    }
    return targets.length;
  }

  // 권한 선택을 멤버십 역할로 옮긴다. 역할 변경도 행 종료 + 새 행 (이력 보존 패턴).
  private async applyAdminRole(
    tx: Prisma.TransactionClient,
    userId: string,
    role: AdminMemberRole,
    leaderTeamId?: string,
  ) {
    const [cellMembership, teamMemberships] = await Promise.all([
      tx.cellMembership.findFirst({
        where: { userId, endedAt: null },
        select: { id: true, cellId: true, role: true },
      }),
      tx.teamMembership.findMany({
        where: { userId, endedAt: null },
        select: { id: true, teamId: true, role: true },
      }),
    ]);

    const setCellRole = async (nextRole: CellRole) => {
      if (!cellMembership || cellMembership.role === nextRole) return;
      await tx.cellMembership.update({
        where: { id: cellMembership.id },
        data: { endedAt: new Date() },
      });
      await tx.cellMembership.create({
        data: {
          cellId: cellMembership.cellId,
          userId,
          role: nextRole,
          startedAt: new Date(),
        },
      });
    };
    // 팀은 여러 개일 수 있다 — 대상 팀의 소속 행만 역할을 바꾼다 (이력 보존: 행 종료 후 새 행).
    const setTeamRole = async (
      membership: { id: string; teamId: string; role: TeamRole },
      nextRole: TeamRole,
    ) => {
      if (membership.role === nextRole) return;
      await tx.teamMembership.update({
        where: { id: membership.id },
        data: { endedAt: new Date() },
      });
      await tx.teamMembership.create({
        data: {
          teamId: membership.teamId,
          userId,
          role: nextRole,
          startedAt: new Date(),
        },
      });
    };
    const demoteAllTeamRoles = async () => {
      for (const membership of teamMemberships) {
        await setTeamRole(membership, 'MEMBER');
      }
    };

    if (role === 'GENERAL') {
      await setCellRole('MEMBER');
      await demoteAllTeamRoles();
      return;
    }
    if (role === 'TEAM_LEADER') {
      if (teamMemberships.length === 0) {
        throw new BadRequestException(
          '소속 팀이 있어야 팀장으로 지정할 수 있습니다.',
        );
      }
      // 여러 팀이면 팀장을 맡을 팀을 leaderTeamId로 받는다. 안 주면 첫 번째 팀이다.
      const target = leaderTeamId
        ? teamMemberships.find(
            (membership) => membership.teamId === leaderTeamId,
          )
        : teamMemberships[0];
      if (!target) {
        throw new BadRequestException(
          '팀장을 맡을 팀은 소속된 팀이어야 합니다.',
        );
      }
      await setTeamRole(target, 'LEADER');
      await setCellRole('MEMBER');
      return;
    }
    // CELL_LEADER(팔로워) — 셀장은 셀당 한 명이라 이미 다른 셀장이 있으면 셀 편집으로 안내.
    if (!cellMembership) {
      throw new BadRequestException(
        '소속 셀이 있어야 팔로워로 지정할 수 있습니다.',
      );
    }
    const otherLeader = await tx.cellMembership.findFirst({
      where: {
        cellId: cellMembership.cellId,
        endedAt: null,
        role: 'LEADER',
        userId: { not: userId },
      },
      select: { id: true },
    });
    if (otherLeader) {
      throw new BadRequestException(
        '이미 셀장이 있는 셀이에요. 셀 편집에서 셀장을 교체해주세요.',
      );
    }
    await setCellRole('LEADER');
    await demoteAllTeamRoles();
  }

  // 프로필 등록·수정 (프로필 설정 화면의 등록하기). 소속 셀/팀은 User 컬럼이 아니라
  // 멤버십 행으로 표현하므로(docs/erd.md — 레거시 cellName/teamId 제거 근거) 여기서 같이 반영한다.
  // 프로필 사진 변경 — 마이페이지 아바타 탭에서 바로 저장한다 (null이면 사진 제거).
  async updateMyAvatar(
    userId: string,
    avatarUrl: string | null,
  ): Promise<MeResponse> {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true },
    });
    // 교체·제거로 더는 안 쓰이는 옛 파일은 그 자리에서 창고에서도 지운다 — 아바타는
    // 다른 곳에서 재사용되지 않는 전용 파일이라 안전하다. 실패해도 교체는 성공한다.
    const oldUrl = before?.avatarUrl;
    if (oldUrl && oldUrl !== avatarUrl) {
      await this.uploadsService.deleteByUrl(oldUrl);
    }
    return (await this.findMe(userId))!;
  }

  // 본인 탈퇴 — 처리 내용은 withdrawOps. 관리자 계정은 권한 양도 절차가 없어서 막는다
  // (withdrawByAdmin과 같은 기준).
  async withdrawMe(userId: string): Promise<void> {
    const me = await this.prisma.user.findFirst({
      where: { id: userId, withdrawnAt: null },
      select: { id: true, isAdmin: true },
    });
    if (!me) throw new NotFoundException('회원을 찾을 수 없습니다.');
    if (me.isAdmin) {
      throw new BadRequestException(
        '관리자 계정은 탈퇴할 수 없습니다. 먼저 다른 관리자에게 권한을 넘겨주세요.',
      );
    }

    await this.prisma.$transaction(this.withdrawOps(userId, new Date()));
  }

  // 마이페이지 통계 카드 3종. 출석주수는 출석 행 수를 그대로 쓴다 — 예배 회차가 주 1회라
  // 회차 수 = 주수다 (WorshipService.date unique).
  async getMyStats(userId: string): Promise<MyStatsResponse> {
    const [qtShareCount, attendanceWeeks, prayerCount] = await Promise.all([
      this.prisma.post.count({
        where: { board: 'QT_SHARE', authorId: userId, deletedAt: null },
      }),
      this.prisma.worshipAttendance.count({
        where: { userId, attended: true },
      }),
      // "내 기도제목" 목록(PrayersService.findMine)과 같은 기준 — 숫자와 목록 건수가 어긋나지 않게.
      this.prisma.post.count({
        where: { board: 'PRAYER', authorId: userId, deletedAt: null },
      }),
    ]);
    return { qtShareCount, attendanceWeeks, prayerCount };
  }

  // 알림 토글 8종 (설정 화면). DB 컬럼명(notify*)과 API 필드명이 달라 여기서 매핑한다.
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifySermonUpload: true,
        notifyLiveWorship: true,
        notifyQtNewPost: true,
        notifyNotice: true,
        notifyBulletin: true,
        notifyChat: true,
        notifyComment: true,
        notifyFollowerNote: true,
      },
    });
    if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.');
    return {
      sermonUpload: user.notifySermonUpload,
      liveWorship: user.notifyLiveWorship,
      qtNewPost: user.notifyQtNewPost,
      notice: user.notifyNotice,
      bulletin: user.notifyBulletin,
      chatMessage: user.notifyChat,
      comment: user.notifyComment,
      followerNote: user.notifyFollowerNote,
    };
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.sermonUpload !== undefined && {
          notifySermonUpload: dto.sermonUpload,
        }),
        ...(dto.liveWorship !== undefined && {
          notifyLiveWorship: dto.liveWorship,
        }),
        ...(dto.qtNewPost !== undefined && { notifyQtNewPost: dto.qtNewPost }),
        ...(dto.notice !== undefined && { notifyNotice: dto.notice }),
        ...(dto.bulletin !== undefined && { notifyBulletin: dto.bulletin }),
        ...(dto.chatMessage !== undefined && { notifyChat: dto.chatMessage }),
        ...(dto.comment !== undefined && { notifyComment: dto.comment }),
        ...(dto.followerNote !== undefined && {
          notifyFollowerNote: dto.followerNote,
        }),
      },
    });
    return this.getNotificationSettings(userId);
  }

  // 기기 푸시 토큰 등록 — token이 unique라서, 같은 기기에 다른 계정으로 로그인하면
  // upsert가 토큰 주인을 새 계정으로 바꾼다 (이전 계정으로 푸시가 새지 않게).
  async registerPushToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token },
    });
  }

  // 내 것이 아닌 토큰은 건드리지 않는다 — deleteMany라 없으면 조용히 0건.
  async removePushToken(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { token, userId } });
  }

  // 동의 기록 — 필수 동의는 현재 방침 버전으로 남기고, 민감정보 동의는 켜고 끌 수 있다.
  async updateConsent(userId: string, dto: UpdateConsentDto): Promise<User> {
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.privacy && {
          privacyConsentAt: now,
          privacyConsentVersion: PRIVACY_POLICY_VERSION,
        }),
        ...(dto.sensitive !== undefined && {
          sensitiveConsentAt: dto.sensitive ? now : null,
        }),
      },
    });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('회원을 찾을 수 없습니다.');
    return user;
  }

  // 동의 화면에서 "동의하지 않고 나가기" (SCRUM-183). 소셜 로그인 순간 계정이 먼저 만들어지므로,
  // 한 번도 동의하지 않았고 프로필도 없는 막 가입한 계정은 바로 지운다 — 동의 전에는 정보를 남기지 않는다.
  // 소셜 연결·토큰·푸시 토큰은 cascade로 같이 지워진다. 이미 가입을 마친 기존 회원(방침 개정으로 다시
  // 묻는 경우)이나 다른 기록이 걸린 계정은 지우지 않는다 — 그 경우 앱은 로그아웃만 한다.
  async declineConsent(userId: string): Promise<{ deleted: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        privacyConsentAt: true,
        birthDate: true,
        gender: true,
        phone: true,
      },
    });
    if (!user || user.privacyConsentAt !== null) return { deleted: false };
    const profileStarted =
      user.birthDate !== null || user.gender !== null || user.phone !== null;
    if (profileStarted) return { deleted: false };
    try {
      await this.prisma.user.delete({ where: { id: userId } });
      return { deleted: true };
    } catch {
      // 지울 수 없게 걸린 기록(외래키)이 있으면 남겨 둔다 — 정상 흐름에선 생기지 않는다.
      return { deleted: false };
    }
  }

  async updateMyProfile(
    userId: string,
    dto: UpdateMyProfileDto,
  ): Promise<MeResponse> {
    const todayYmd = kstToday().toISOString().slice(0, 10);
    if (ageOn(dto.birthDate, todayYmd) < MIN_SIGNUP_AGE) {
      throw new BadRequestException('만 14세 미만은 가입할 수 없어요.');
    }
    await this.prisma.$transaction(async (tx) => {
      if (dto.cellId) {
        const cell = await tx.cell.findFirst({
          where: { id: dto.cellId, deletedAt: null },
          select: { id: true },
        });
        if (!cell) throw new BadRequestException('존재하지 않는 셀입니다.');
      }
      if (dto.teamIds.length > 0) {
        const found = await tx.team.count({
          where: { id: { in: dto.teamIds }, deletedAt: null },
        });
        if (found !== dto.teamIds.length) {
          throw new BadRequestException('존재하지 않는 팀입니다.');
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          birthDate: new Date(dto.birthDate),
          gender: dto.gender,
          phone: dto.phone,
        },
      });
      await this.syncCellMembership(tx, userId, dto.cellId);
      await this.syncTeamMemberships(tx, userId, dto.teamIds);
    });

    // 방금 update가 성공했으므로 유저는 반드시 있다.
    return (await this.findMe(userId))!;
  }

  // 소속 변경은 기존 행을 지우지 않고 endedAt을 찍고 새 행을 만든다 — 소속 이력 보존
  // (schema.prisma의 CellMembership/TeamMembership 주석). null이면 현재 소속만 끝낸다.
  private async syncCellMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    cellId: string | null,
  ) {
    const active = await tx.cellMembership.findFirst({
      where: { userId, endedAt: null },
      select: { id: true, cellId: true },
    });
    if ((active?.cellId ?? null) === cellId) return;

    const today = new Date();
    if (active) {
      await tx.cellMembership.update({
        where: { id: active.id },
        data: { endedAt: today },
      });
    }
    if (cellId) {
      await tx.cellMembership.create({
        data: { userId, cellId, startedAt: today },
      });
    }
  }

  // 여러 팀 소속용 — 목록에 없는 현재 소속은 끝내고, 새로 고른 팀만 만든다.
  // 이미 소속인 팀의 행은 그대로 둔다(팀장 역할이 유지된다).
  private async syncTeamMemberships(
    tx: Prisma.TransactionClient,
    userId: string,
    teamIds: string[],
  ) {
    const active = await tx.teamMembership.findMany({
      where: { userId, endedAt: null },
      select: { id: true, teamId: true },
    });
    const today = new Date();
    const stale = active.filter((row) => !teamIds.includes(row.teamId));
    if (stale.length > 0) {
      await tx.teamMembership.updateMany({
        where: { id: { in: stale.map((row) => row.id) } },
        data: { endedAt: today },
      });
    }
    const kept = new Set(active.map((row) => row.teamId));
    for (const teamId of teamIds) {
      if (kept.has(teamId)) continue;
      await tx.teamMembership.create({
        data: { userId, teamId, startedAt: today },
      });
    }
  }

  private async syncTeamMembership(
    tx: Prisma.TransactionClient,
    userId: string,
    teamId: string | null,
  ) {
    // 관리자 편집은 팀을 하나만 고르는 화면이라, 이미 그 팀 소속이면 다른 팀 소속은 건드리지 않는다.
    const active = await tx.teamMembership.findMany({
      where: { userId, endedAt: null },
      select: { id: true, teamId: true },
    });
    if (
      teamId === null
        ? active.length === 0
        : active.some((row) => row.teamId === teamId)
    ) {
      return;
    }

    const today = new Date();
    if (active.length > 0) {
      await tx.teamMembership.updateMany({
        where: { id: { in: active.map((row) => row.id) } },
        data: { endedAt: today },
      });
    }
    if (teamId) {
      await tx.teamMembership.create({
        data: { userId, teamId, startedAt: today },
      });
    }
  }
}
