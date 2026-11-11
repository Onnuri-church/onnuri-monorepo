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

// POST /teams 요청 본문 (관리자 전용) — 팀 생성 폼(팀 이름/팀장/아이콘/배경사진/한 줄 소개/팀 소개).
export class CreateTeamDto {
  @IsString()
  @IsNotEmpty({ message: '팀 이름을 입력해주세요.' })
  @MaxLength(30, { message: '이름은 30자까지 쓸 수 있어요.' })
  name!: string;

  // 팀장은 한 명 이상 — 팀에 따라 여러 명일 수 있다 (셀장·부셀장처럼).
  @IsArray()
  @ArrayMinSize(1, { message: '팀장을 한 명 이상 선택해주세요.' })
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  leaderIds!: string[];

  // 앱 Icon 에셋의 이름 — 모르는 값이 와도 앱이 회색 원으로 처리해서 따로 검증하지 않는다.
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
