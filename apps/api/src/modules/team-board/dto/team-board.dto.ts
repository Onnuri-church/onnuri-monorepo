import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { BOARD_EMOJIS } from '@onnuri/shared';

export const BOARD_MAX_IMAGES = 5;
export const BOARD_MAX_LINKS = 5;
export const BOARD_MAX_FILES = 3;

export class BoardFileDto {
  @IsUrl()
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(0)
  size!: number;
}

// POST·PATCH /teams/:teamId/board 요청 본문 — 계약은 @onnuri/shared의 SaveTeamBoardPostRequest.
// 내용·첨부 중 하나는 있어야 하는 검사는 서비스가 한다 (사진만 올리는 글도 있다).
export class SaveTeamBoardPostDto {
  @IsString()
  @MaxLength(5000, { message: '글은 5000자까지 쓸 수 있어요.' })
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BOARD_MAX_IMAGES, { message: '사진은 최대 5장까지 올릴 수 있어요.' })
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BOARD_MAX_LINKS, { message: '링크는 최대 5개까지 달 수 있어요.' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  links?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BOARD_MAX_FILES, { message: '파일은 최대 3개까지 올릴 수 있어요.' })
  @ValidateNested({ each: true })
  @Type(() => BoardFileDto)
  files?: BoardFileDto[];

  @IsOptional()
  @IsBoolean()
  isNotice?: boolean;
}

// POST …/comments 요청 본문
export class CreateTeamBoardCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자까지 쓸 수 있어요.' })
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

// PATCH …/comments/:commentId 요청 본문
export class UpdateTeamBoardCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자까지 쓸 수 있어요.' })
  content!: string;
}

// PUT …/reactions 요청 본문
export class ToggleTeamBoardReactionDto {
  @IsIn([...BOARD_EMOJIS], { message: '사용할 수 없는 이모지예요.' })
  emoji!: string;
}
