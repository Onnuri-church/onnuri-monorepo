import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  } from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// POST /posts/team-activities 요청 본문 — 작성 시안(날짜/부서/사진 최대 5장/제목/내용).
// 계약은 @onnuri/shared의 CreateTeamActivityRequest.
export class CreateTeamActivityDto {
  @IsString()
  @IsNotEmpty({ message: '부서를 선택해주세요.' })
  teamId!: string;

  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content!: string;

  @IsYmdDate({ message: 'eventDate는 YYYY-MM-DD 형식이어야 합니다.' })
  eventDate!: string;

  // POST /uploads가 돌려준 주소들 — 사진 파일이 아니라 주소만 받는다.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '사진은 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  imageUrls?: string[];
}
