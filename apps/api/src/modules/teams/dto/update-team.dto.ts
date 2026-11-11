import { IsStorageUrl } from '../../../common/validators/is-storage-url';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// PATCH /teams/:id 요청 본문 (관리자 전용) — 보낸 필드만 반영한다.
export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: '이름은 30자까지 쓸 수 있어요.' })
  name?: string;

  // 보내면 이 목록이 팀장 전체가 된다 (빠진 기존 팀장은 팀원으로 내려온다).
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: '팀장을 한 명 이상 선택해주세요.' })
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  leaderIds?: string[];

  @IsOptional()
  @IsString()
  iconName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '한 줄 소개는 100자까지 쓸 수 있어요.' })
  tagline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: '설명은 5000자까지 쓸 수 있어요.' })
  description?: string | null;

  @IsOptional()
  @IsString()
  @IsStorageUrl()
  coverImageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  canUploadBulletin?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageBanner?: boolean;
}
