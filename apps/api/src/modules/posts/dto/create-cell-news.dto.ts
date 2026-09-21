import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

// POST /posts/cell-news 요청 본문 — 글쓰기 시안(날짜/사진 최대 5장/제목/내용).
export class CreateCellNewsDto {
  @IsString()
  @IsNotEmpty({ message: 'cellId는 필수입니다.' })
  cellId!: string;

  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  content!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'eventDate는 YYYY-MM-DD 형식이어야 합니다.',
  })
  eventDate!: string;

  // POST /uploads가 돌려준 주소들 — Image(POST_CONTENT) 행으로 쌓여 갤러리에 자동 포함된다.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '사진은 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  imageUrls?: string[];
}
