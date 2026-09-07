import { PrismaClient } from '../generated/prisma';

// 개발용 시드 — 프로필 설정 화면의 소속 셀/팀 선택지(GET /cells·/teams)가 비지 않게 채운다.
// 실행: pnpm --filter @onnuri/api run prisma:seed. 여러 번 돌려도 안전하다(이름 기준으로 있으면 건너뜀).
// 셀/팀 관리 기능(관리자)이 생기면 이 시드는 초기 데이터 투입용으로만 남는다.

const prisma = new PrismaClient();

// 이름은 시안(프로필 설정 드롭다운)에서 가져왔다.
const CELL_NAMES = [
  '범준셀',
  '상현셀',
  '수빈셀',
  '영우셀',
  '예은셀',
  '지수셀',
  '지연셀',
  '지환셀',
  '준영셀',
  '현호셀',
  '혜민셀',
  '효원셀',
];
const TEAM_NAMES = [
  '디자인팀',
  '방송팀',
  '영상팀',
  '중보기도팀',
  '찬양팀',
  '풋살팀',
  'SNS팀',
];

async function main() {
  // Cell.createdById가 유저를 요구해서 시드용 관리자 계정을 만든다. 소셜 로그인 전용이라
  // 이 이메일로는 로그인할 수 없다 (개발용 로그인은 AUTH_DEV_LOGIN=true 환경에서만 열린다).
  const admin = await prisma.user.upsert({
    where: { email: 'admin@onnuri.local' },
    update: {},
    create: { email: 'admin@onnuri.local', name: '관리자', isAdmin: true },
  });

  for (const name of TEAM_NAMES) {
    await prisma.team.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 셀 이름은 유니크가 아니라 upsert 대신 있으면 건너뛴다.
  const today = new Date();
  const oneYearLater = new Date(today);
  oneYearLater.setFullYear(today.getFullYear() + 1);
  for (const name of CELL_NAMES) {
    const existing = await prisma.cell.findFirst({ where: { name } });
    if (existing) continue;
    await prisma.cell.create({
      data: {
        name,
        startedAt: today,
        // 활동 종료 예정일은 임시로 1년 뒤 — 실제 값은 관리자 기능에서 정한다.
        expiresAt: oneYearLater,
        createdById: admin.id,
      },
    });
  }

  console.log(`시드 완료: 셀 ${CELL_NAMES.length}개 · 팀 ${TEAM_NAMES.length}개 기준으로 맞춤`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
