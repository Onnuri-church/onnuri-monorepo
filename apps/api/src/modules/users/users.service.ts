import { Injectable } from '@nestjs/common';
import type { User } from '@onnuri/shared';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
    if (!user) return null;

    return {
      ...user,
      // 계약: birthDate는 YYYY-MM-DD (나이는 클라이언트가 계산), createdAt은 ISO 문자열
      birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
