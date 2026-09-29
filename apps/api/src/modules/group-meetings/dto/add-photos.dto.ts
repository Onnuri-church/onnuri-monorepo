import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

// POST /group-meetings/:id/photos 요청 본문 — 계약은 @onnuri/shared의 AddGroupMeetingPhotosRequest.
export class AddPhotosDto {
  @IsArray()
  @ArrayMinSize(1, { message: '사진을 한 장 이상 골라주세요.' })
  @ArrayMaxSize(10, { message: '사진은 한 번에 10장까지 올릴 수 있어요.' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  imageUrls!: string[];
}
