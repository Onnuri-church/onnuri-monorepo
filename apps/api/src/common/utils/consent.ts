import { ForbiddenException } from '@nestjs/common';

import type { PrismaService } from '../../modules/prisma/prisma.service';

// 큐티나눔·기도제목처럼 신앙 관련 정보가 담기는 글은 민감정보 처리 동의가 있어야 쓸 수 있다
// (개인정보처리방침 "민감정보의 처리", SCRUM-175). 읽기·댓글은 막지 않는다.
export async function assertSensitiveConsent(
  prisma: PrismaService,
  userId: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sensitiveConsentAt: true },
  });
  if (!user?.sensitiveConsentAt) {
    throw new ForbiddenException(
      '큐티나눔·기도제목을 쓰려면 민감정보 처리 동의가 필요해요.',
    );
  }
}
