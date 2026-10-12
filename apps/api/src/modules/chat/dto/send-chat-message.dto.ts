import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const CHAT_MAX_IMAGES = 5;
export const CHAT_MAX_VIDEOS = 3;
export const CHAT_MAX_FILES = 3;

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;

// 투표 만들기 — 계약은 @onnuri/shared의 CreateChatPollRequest.
export class CreateChatPollDto {
  @IsString()
  @IsNotEmpty({ message: '투표 제목을 입력해주세요.' })
  @MaxLength(100, { message: '투표 제목은 100자까지 쓸 수 있어요.' })
  title!: string;

  @IsArray()
  @ArrayMinSize(POLL_MIN_OPTIONS, { message: '항목은 2개 이상이어야 해요.' })
  @ArrayMaxSize(POLL_MAX_OPTIONS, { message: '항목은 10개까지 만들 수 있어요.' })
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: '항목은 50자까지 쓸 수 있어요.' })
  options!: string[];

  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAddOptions?: boolean;

  @IsOptional()
  @IsISO8601()
  closesAt?: string;
}

// 첨부 파일 한 건 — 계약은 @onnuri/shared의 ChatFile.
export class ChatFileDto {
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

// POST …/messages 요청 본문 — 계약은 @onnuri/shared의 SendChatMessageRequest.
// 내용·첨부 중 하나는 있어야 하는 검사는 서비스가 한다 (사진만 보내는 메시지도 있다).
export class SendChatMessageDto {
  @IsString()
  @MaxLength(1000, { message: '메시지는 1000자까지 보낼 수 있어요.' })
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_MAX_IMAGES, { message: '사진은 최대 5장까지 보낼 수 있어요.' })
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_MAX_VIDEOS, { message: '동영상은 최대 3개까지 보낼 수 있어요.' })
  @IsUrl({}, { each: true })
  videoUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_MAX_FILES, { message: '파일은 최대 3개까지 보낼 수 있어요.' })
  @ValidateNested({ each: true })
  @Type(() => ChatFileDto)
  files?: ChatFileDto[];

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  mentionedUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  asNotice?: boolean;

  // 있으면 투표 메시지로 보낸다 — content는 무시하고 poll.title을 쓴다.
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateChatPollDto)
  poll?: CreateChatPollDto;
}
