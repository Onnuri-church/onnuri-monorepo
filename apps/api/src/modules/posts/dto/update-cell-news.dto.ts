import { IsStorageUrl } from '../../../common/validators/is-storage-url';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsYmdDate } from '../../../common/validators/is-ymd-date';

// PATCH /posts/cell-news/:id 요청 본문 — 보낸 필드만 반영.
// imageUrls를 보내면 본문 사진 전체 교체다 (글쓰기 화면이 최종 목록을 통째로 보낸다).
export class UpdateCellNewsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MaxLength(100, { message: '제목은 100자까지 쓸 수 있어요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @MaxLength(5000, { message: '내용은 5000자까지 쓸 수 있어요.' })
  content?: string;

  @IsOptional()
  @IsYmdDate({ message: 'eventDate는 YYYY-MM-DD 형식이어야 합니다.' })
  eventDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '사진은 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  @IsStorageUrl({ each: true })
  imageUrls?: string[];
}
