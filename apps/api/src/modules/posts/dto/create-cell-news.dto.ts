import { IsNotEmpty, IsString, Matches } from 'class-validator';

// POST /posts/cell-news 요청 본문 — 글쓰기 시안(날짜/사진/제목/내용) 중 사진은
// 업로드 인프라가 붙은 뒤 별도 계약으로 추가한다.
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
}
