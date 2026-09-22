import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// PATCH /posts/cell-news/:id 요청 본문 — 보낸 필드만 반영.
// imageUrls를 보내면 본문 사진 전체 교체다 (글쓰기 화면이 최종 목록을 통째로 보낸다).
export class UpdateCellNewsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'eventDate는 YYYY-MM-DD 형식이어야 합니다.',
  })
  eventDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '사진은 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  imageUrls?: string[];
}
