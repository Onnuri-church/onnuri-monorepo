import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

// PATCH /bulletins/:id 요청 본문 — 날짜는 바꾸지 않고 이미지만 통째로 교체한다.
// 계약은 @onnuri/shared의 UpdateBulletinRequest.
export class UpdateBulletinDto {
  @IsArray()
  @ArrayMinSize(2, { message: '주보는 2장을 올려주세요.' })
  @ArrayMaxSize(2, { message: '주보는 2장을 올려주세요.' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  bulletinImageUrls!: string[];

  // 나눔지는 없어도 된다 (빈 배열이면 나눔지를 모두 지운다).
  @IsArray()
  @ArrayMaxSize(5, { message: '나눔지는 최대 5장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  handoutImageUrls!: string[];
}
