import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  } from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// POST /bulletins 요청 본문 — 등록 시안(날짜 / 주보 2장 고정 / 나눔지 최대 5장).
// 계약은 @onnuri/shared의 CreateBulletinRequest.
export class CreateBulletinDto {
  @IsYmdDate({ message: 'date는 YYYY-MM-DD 형식이어야 합니다.' })
  // 형식만 보면 2026-13-01은 Invalid Date로 DB에서 500이 나고, 2026-02-30은 3월 2일로
  // 조용히 넘어가 엉뚱한 날짜에 주보가 붙는다 — 실제로 있는 날짜인지까지 본다.
  @IsDateString({ strict: true }, { message: '없는 날짜예요.' })
  date!: string;

  // POST /uploads가 돌려준 주소들. 주보는 앞·뒤 2장 고정이다.
  @IsArray()
  @ArrayMinSize(2, { message: '주보는 2장을 올려주세요.' })
  @ArrayMaxSize(2, { message: '주보는 2장을 올려주세요.' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  bulletinImageUrls!: string[];

  @IsArray()
  @ArrayMinSize(1, { message: '나눔지를 1장 이상 올려주세요.' })
  @ArrayMaxSize(5, { message: '나눔지는 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  handoutImageUrls!: string[];
}
