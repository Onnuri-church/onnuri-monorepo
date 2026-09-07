import { PHONE_NUMBER_REGEX } from '@onnuri/shared';
import {
  IsEnum,
  IsISO8601,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

import { Gender } from '../../../../generated/prisma';

// PATCH /users/me 요청 본문 — 계약은 @onnuri/shared의 UpdateMyProfileRequest.
// 프로필 설정 화면이 모든 항목을 채워 보내므로 부분 수정(필드 생략)은 받지 않는다.
export class UpdateMyProfileDto {
  // YYYY-MM-DD만 받는다 — Matches가 시각 붙은 ISO 문자열을 거르고,
  // strict가 2월 31일처럼 존재하지 않는 날짜를 거른다.
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @Matches(PHONE_NUMBER_REGEX, {
    message: '전화번호는 하이픈 없이 01로 시작하는 10~11자리여야 합니다.',
  })
  phone!: string;

  // "소속 없음"은 null로 온다. 필드 자체가 빠진 것(undefined)은 IsString이 걸러 400이다.
  @ValidateIf((_, value) => value !== null)
  @IsString()
  cellId!: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  teamId!: string | null;
}
