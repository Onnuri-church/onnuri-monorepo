import { IsStorageUrl } from '../../../common/validators/is-storage-url';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// POST /notices 요청 본문 — 내용(content)이나 이미지 중 하나는 있어야 한다 (서비스가 400으로 거른다).
export class CreateNoticeDto {
  @IsString()
  @IsNotEmpty({ message: '제목을 입력해주세요.' })
  @MaxLength(100, { message: '제목은 100자까지 쓸 수 있어요.' })
  title!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @MaxLength(5000, { message: '내용은 5000자까지 쓸 수 있어요.' })
  content?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsStorageUrl()
  imageUrl?: string;
}
