import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { FollowerNoteInfo } from '@onnuri/shared';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// 테스트 데이터 식별용 접두사/도메인 — 공용 개발 DB를 쓰므로 시드/실데이터와 안 겹치게 붙인다.
const EMAIL_DOMAIN = 'note-comments-e2e.test';
const FIXTURE_PREFIX = 'note-comments-e2e-';
// 노트가 붙을 예배 회차 — 실데이터와 겹치지 않게 먼 미래 일요일을 쓰고 정리 때 지운다.
const MEETING_DATE = new Date('2099-01-04');

// 팔로워 노트 댓글 수정·삭제 (2026-10-27 확정): 수정은 작성자 본인만, 삭제는 본인 + 관리자.
// 원댓글을 지우면 달린 답글도 같이 지워진다.
describe('Follower note comments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let cellId: string;
  let noteId: string;
  let adminToken: string;
  let leaderToken: string;
  let memberToken: string;

  const cleanup = async () => {
    // 셀을 지우면 셀모임 → 노트 → 댓글, 멤버십까지 cascade로 지워진다.
    await prisma.cell.deleteMany({
      where: { name: { startsWith: FIXTURE_PREFIX } },
    });
    await prisma.worshipService.deleteMany({ where: { date: MEETING_DATE } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
  };

  const devLogin = async (name: string, role?: 'ADMIN') => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/dev')
      .send({ email: `${name}@${EMAIL_DOMAIN}`, ...(role ? { role } : {}) })
      .expect(201);
    const body = res.body as { accessToken: string; user: { id: string } };
    return { token: body.accessToken, userId: body.user.id };
  };

  const notesPath = () => `/cells/${cellId}/follower-notes`;
  const commentsPath = () => `${notesPath()}/${noteId}/comments`;

  const addComment = async (
    token: string,
    content: string,
    parentId?: string,
  ) => {
    const res = await request(app.getHttpServer())
      .post(commentsPath())
      .set('Authorization', `Bearer ${token}`)
      .send({ content, ...(parentId ? { parentId } : {}) })
      .expect(201);
    const notes = res.body as FollowerNoteInfo[];
    const comment = notes
      .find((note) => note.id === noteId)!
      .comments.find((item) => item.content === content)!;
    return comment.id;
  };

  const commentsAs = async (token: string) => {
    const res = await request(app.getHttpServer())
      .get(notesPath())
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (res.body as FollowerNoteInfo[]).find((note) => note.id === noteId)!
      .comments;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await cleanup();

    const admin = await devLogin('admin', 'ADMIN');
    const leader = await devLogin('leader');
    const member = await devLogin('member');
    adminToken = admin.token;
    leaderToken = leader.token;
    memberToken = member.token;

    const cell = await prisma.cell.create({
      data: {
        name: `${FIXTURE_PREFIX}셀`,
        startedAt: new Date('2026-01-01'),
        expiresAt: new Date('2099-12-31'),
        createdById: admin.userId,
      },
    });
    cellId = cell.id;
    await prisma.cellMembership.createMany({
      data: [
        {
          cellId,
          userId: leader.userId,
          role: 'LEADER',
          startedAt: new Date('2026-01-01'),
        },
        {
          cellId,
          userId: member.userId,
          role: 'MEMBER',
          startedAt: new Date('2026-01-01'),
        },
      ],
    });
    const service = await prisma.worshipService.create({
      data: { date: MEETING_DATE, name: '주일예배' },
    });
    const meeting = await prisma.cellMeeting.create({
      data: { cellId, serviceId: service.id, createdById: leader.userId },
    });
    const note = await prisma.followerNote.create({
      data: { meetingId: meeting.id, authorId: leader.userId, answer1: '근황' },
    });
    noteId = note.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('수정·삭제 가능 여부를 댓글마다 내려준다 (수정은 본인, 삭제는 본인 + 관리자)', async () => {
    const adminCommentId = await addComment(adminToken, '목사님 댓글');
    const replyId = await addComment(leaderToken, '셀장 답글', adminCommentId);

    const asLeader = await commentsAs(leaderToken);
    expect(asLeader.find((c) => c.id === adminCommentId)).toMatchObject({
      canEdit: false,
      canDelete: false,
    });
    expect(asLeader.find((c) => c.id === replyId)).toMatchObject({
      canEdit: true,
      canDelete: true,
    });

    const asAdmin = await commentsAs(adminToken);
    expect(asAdmin.find((c) => c.id === adminCommentId)).toMatchObject({
      canEdit: true,
      canDelete: true,
    });
    expect(asAdmin.find((c) => c.id === replyId)).toMatchObject({
      canEdit: false,
      canDelete: true,
    });
  });

  it('남의 댓글은 수정할 수 없다 — 관리자도 마찬가지', async () => {
    const adminCommentId = await addComment(adminToken, '관리자 원본');
    const leaderCommentId = await addComment(leaderToken, '셀장 원본');

    await request(app.getHttpServer())
      .patch(`${commentsPath()}/${adminCommentId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ content: '바꿈' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`${commentsPath()}/${leaderCommentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: '바꿈' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`${commentsPath()}/${adminCommentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: '관리자 수정본' })
      .expect(200);
    const comments = await commentsAs(adminToken);
    expect(comments.find((c) => c.id === adminCommentId)?.content).toBe(
      '관리자 수정본',
    );
  });

  it('셀장은 관리자 댓글을 지울 수 없고, 관리자는 셀장 댓글을 지울 수 있다', async () => {
    const adminCommentId = await addComment(adminToken, '지우면 안 되는 댓글');
    const leaderCommentId = await addComment(leaderToken, '관리자가 지울 댓글');

    await request(app.getHttpServer())
      .delete(`${commentsPath()}/${adminCommentId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`${commentsPath()}/${leaderCommentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ids = (await commentsAs(adminToken)).map((c) => c.id);
    expect(ids).toContain(adminCommentId);
    expect(ids).not.toContain(leaderCommentId);
  });

  it('원댓글을 지우면 달린 답글도 같이 지워진다', async () => {
    const parentId = await addComment(adminToken, '답글 달릴 댓글');
    const replyId = await addComment(leaderToken, '같이 지워질 답글', parentId);

    await request(app.getHttpServer())
      .delete(`${commentsPath()}/${parentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ids = (await commentsAs(adminToken)).map((c) => c.id);
    expect(ids).not.toContain(parentId);
    expect(ids).not.toContain(replyId);
  });

  it('노트를 볼 수 없는 셀원은 댓글을 고치거나 지울 수 없다', async () => {
    const commentId = await addComment(leaderToken, '셀원이 건드릴 댓글');

    await request(app.getHttpServer())
      .patch(`${commentsPath()}/${commentId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ content: '바꿈' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`${commentsPath()}/${commentId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('없는 댓글이면 404', async () => {
    await request(app.getHttpServer())
      .delete(`${commentsPath()}/no-such-comment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
