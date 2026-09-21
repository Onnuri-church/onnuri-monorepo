import { PrismaClient } from '../generated/prisma';

// 개발용 시드 — 프로필 설정 화면의 소속 셀/팀 선택지(GET /cells·/teams)와 큐티나눔 목록
// (GET /posts/qt-shares)이 비지 않게 채운다.
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

// 큐티나눔 작성자 — 소셜 로그인 전용이라 이 이메일로는 로그인할 수 없다(관리자 계정과 같다).
const QT_AUTHORS = [
  { email: 'wonjunho@onnuri.local', name: '원준호' },
  { email: 'kimseoyeon@onnuri.local', name: '김서연' },
  { email: 'leejeongmin@onnuri.local', name: '이정민' },
];

// 내용은 큐티나눔 목록 화면의 임시 데이터에서 가져왔다. 월 필터가 실제로 도는지 보려고
// 한 달에 몰아넣지 않고 3개 달에 나눠 둔다.
const QT_POSTS = [
  {
    authorEmail: 'wonjunho@onnuri.local',
    eventDate: '2026-05-07',
    passage: '룻기 1:19-22',
    title: '절망, 자기 우상화의 열매',
    content:
      '자신의 인생이 텅 비었다고 고백하는 나오미의 판단과 생각과 다르게 하나님은 점차 그를 채워가고 계셨다.',
  },
  {
    authorEmail: 'kimseoyeon@onnuri.local',
    eventDate: '2026-05-06',
    passage: '룻기 2:1-13',
    title: '묵묵히 걷는 길 위에서',
    content:
      '당장 답이 보이지 않아도 그 자리를 지키는 것이 믿음이라는 걸 배운다. 조급함을 내려놓는 하루였다.',
  },
  {
    authorEmail: 'leejeongmin@onnuri.local',
    eventDate: '2026-05-05',
    passage: '룻기 2:16-23',
    title: '다시 돌아오는 마음',
    content:
      '멀리 돌아왔지만 늦지 않았다고 말씀하시는 것 같았다. 돌아설 수 있는 것 자체가 은혜였다.',
  },
  {
    authorEmail: 'wonjunho@onnuri.local',
    eventDate: '2026-04-21',
    passage: '시편 23:1-6',
    title: '부족함 없는 자리',
    content:
      '가진 것이 늘어서가 아니라 인도하시는 분이 계셔서 부족함이 없다는 고백이라는 걸 이제야 알겠다.',
  },
  {
    authorEmail: 'kimseoyeon@onnuri.local',
    eventDate: '2026-03-18',
    passage: '마태복음 6:25-34',
    title: '내일을 염려하지 않기로',
    content:
      '내일 일은 내일이 염려할 것이라는 말씀 앞에서, 오늘 감당할 몫만 붙드는 연습을 시작했다.',
  },
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

  const authors = new Map<string, string>();
  for (const { email, name } of QT_AUTHORS) {
    const author = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name },
    });
    authors.set(email, author.id);
  }

  // 큐티나눔 글. Post에는 유니크 키가 없어서 셀과 같은 방식으로 있으면 건너뛴다.
  // 좋아요는 글을 새로 만들 때만 함께 넣는다 — 다시 돌려도 수가 늘지 않는다.
  const likers = [admin.id, ...authors.values()];
  for (const [index, post] of QT_POSTS.entries()) {
    const existing = await prisma.post.findFirst({
      where: { board: 'QT_SHARE', title: post.title },
    });
    if (existing) continue;
    await prisma.post.create({
      data: {
        board: 'QT_SHARE',
        authorId: authors.get(post.authorEmail)!,
        title: post.title,
        content: post.content,
        eventDate: new Date(post.eventDate),
        qtShare: { create: { passage: post.passage } },
        likes: {
          create: likers
            .slice(0, index % likers.length)
            .map((userId) => ({ userId })),
        },
      },
    });
  }

  console.log(
    `시드 완료: 셀 ${CELL_NAMES.length}개 · 팀 ${TEAM_NAMES.length}개 · 큐티나눔 ${QT_POSTS.length}개 기준으로 맞춤`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
