import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BulletinDetail,
  BulletinListItem,
  BulletinListResponse,
  BulletinMonth,
} from '@onnuri/shared';

import {
  toDateLabel,
  toMonthLabel,
  toMonthValue,
} from '../../common/utils/date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBulletinDto } from './dto/create-bulletin.dto';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 주보가 있는 회차 = BULLETIN 이미지가 붙은 회차. 나눔지만 있는 회차는 등록 API가 만들지 않는다.
const HAS_BULLETIN = { images: { some: { kind: 'BULLETIN' as const } } };

const SERVICE_SELECT = {
  id: true,
  date: true,
  // 카드 제목은 같은 날 설교 제목을 빌려 쓴다 — 주보 등록 화면에 제목 입력이 없어서다.
  sermon: { select: { title: true, deletedAt: true } },
} as const;

type ServiceRow = {
  id: string;
  date: Date;
  sermon: { title: string; deletedAt: Date | null } | null;
};

// "2026.06.01 (일)" — date는 @db.Date라 UTC로 읽는다 (common/utils/date 주석).
function toDateWithWeekdayLabel(date: Date): string {
  return `${toDateLabel(date)} (${WEEKDAY_LABELS[date.getUTCDay()]})`;
}

// 주보·나눔지 — 별도 테이블 없이 그 주 예배 회차(WorshipService)에 붙은 Image(BULLETIN/HANDOUT)다.
@Injectable()
export class BulletinsService {
  constructor(private readonly prisma: PrismaService) {}

  private toListItem(row: ServiceRow): BulletinListItem {
    return {
      id: row.id,
      dateLabel: toDateWithWeekdayLabel(row.date),
      // 설교영상이 아직 안 올라왔거나 관리자가 지운 영상이면 제목이 없다.
      title: row.sermon && !row.sermon.deletedAt ? row.sermon.title : null,
    };
  }

  async findBulletins(month?: string): Promise<BulletinListResponse> {
    const months = await this.findMonths();
    // 요청한 달에 주보가 없으면(또는 month 생략) 가장 최근 달을 보여준다.
    const selected =
      months.find((item) => item.value === month)?.value ?? months[0]?.value;
    if (!selected) return { months, selectedMonth: null, items: [] };

    const [year, monthOfYear] = selected.split('.').map(Number);
    const rows = await this.prisma.worshipService.findMany({
      where: {
        ...HAS_BULLETIN,
        date: {
          gte: new Date(Date.UTC(year, monthOfYear - 1, 1)),
          lt: new Date(Date.UTC(year, monthOfYear, 1)),
        },
      },
      select: SERVICE_SELECT,
      orderBy: { date: 'desc' },
    });

    return {
      months,
      selectedMonth: selected,
      items: rows.map((row) => this.toListItem(row)),
    };
  }

  async findBulletin(id: string): Promise<BulletinDetail> {
    const row = await this.prisma.worshipService.findFirst({
      where: { id, ...HAS_BULLETIN },
      select: {
        ...SERVICE_SELECT,
        images: {
          where: { kind: { in: ['BULLETIN', 'HANDOUT'] } },
          select: { id: true, url: true, kind: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!row) throw new NotFoundException('주보를 찾을 수 없습니다.');

    const pick = (kind: 'BULLETIN' | 'HANDOUT') =>
      row.images
        .filter((image) => image.kind === kind)
        .map(({ id: imageId, url }) => ({ id: imageId, url }));

    return {
      ...this.toListItem(row),
      bulletinImages: pick('BULLETIN'),
      handoutImages: pick('HANDOUT'),
    };
  }

  // 한 날짜에 한 건 — 이미 있으면 거부한다 (교체는 받지 않는다. 수정·삭제는 별도 기능).
  async createBulletin(
    adminId: string,
    dto: CreateBulletinDto,
  ): Promise<BulletinDetail> {
    const date = new Date(dto.date);

    const serviceId = await this.prisma.$transaction(async (tx) => {
      // 예배 회차가 없으면 만든다 — 회차 관리 기능 전 임시 처리 (출석·팔로워 노트와 동일).
      const service = await tx.worshipService.upsert({
        where: { date },
        update: {},
        create: { date, name: '주일예배' },
      });

      const existing = await tx.image.count({
        where: { serviceId: service.id, kind: 'BULLETIN' },
      });
      if (existing > 0) {
        throw new BadRequestException('이 날짜에는 이미 주보가 등록돼 있어요.');
      }

      const toImages = (urls: string[], kind: 'BULLETIN' | 'HANDOUT') =>
        urls.map((url, index) => ({
          url,
          kind,
          serviceId: service.id,
          uploadedById: adminId,
          takenOn: date,
          sortOrder: index,
        }));
      await tx.image.createMany({
        data: [
          ...toImages(dto.bulletinImageUrls, 'BULLETIN'),
          ...toImages(dto.handoutImageUrls, 'HANDOUT'),
        ],
      });
      return service.id;
    });

    return this.findBulletin(serviceId);
  }

  private async findMonths(): Promise<BulletinMonth[]> {
    const rows = await this.prisma.worshipService.findMany({
      where: HAS_BULLETIN,
      select: { date: true },
      orderBy: { date: 'desc' },
    });

    const values = [...new Set(rows.map((row) => toMonthValue(row.date)))];
    return values.map((value) => ({ value, label: toMonthLabel(value) }));
  }
}
