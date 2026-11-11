import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// POST /group-meetings 요청 본문 (관리자 전용) — 2026-09-21 생성 시안:
// 배경사진/이름/설명문/모집일(기간)/장소/비용/소그룹장(한 명 이상). 사진은 업로드 인프라 후.
export class CreateGroupMeetingDto {
  @IsString()
  @IsNotEmpty({ message: '소그룹 이름을 입력해주세요.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: '설명문을 입력해주세요.' })
  description!: string;

  @IsYmdDate({ message: 'recruitStart는 YYYY-MM-DD 형식이어야 합니다.' })
  recruitStart!: string;

  @IsYmdDate({ message: 'recruitEnd는 YYYY-MM-DD 형식이어야 합니다.' })
  recruitEnd!: string;

  // 모임일 — 자유 글 ("매주 토요일 오후 6시"). 앱 폼은 필수로 받지만, 이 칸이 없던 구버전 앱의
  // 생성 요청도 통과하도록 서버에서는 선택으로 둔다 (없으면 상세에 "미정").
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '모임일을 입력해주세요.' })
  schedule?: string;

  @IsString()
  @IsNotEmpty({ message: '장소를 입력해주세요.' })
  place!: string;

  @IsString()
  @IsNotEmpty({ message: '비용을 입력해주세요.' })
  cost!: string;

  @IsArray()
  @ArrayMinSize(1, { message: '소그룹장을 한 명 이상 지정해주세요.' })
  @IsString({ each: true })
  leaderIds!: string[];

  // POST /uploads가 돌려준 주소 — 카드 썸네일·상세 히어로에 쓰인다.
  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;
}
