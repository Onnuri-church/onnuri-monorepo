import { ArrayMinSize, IsArray, IsString } from 'class-validator';

// DELETE /teams/:id/gallery 요청 본문 — 편집 모드에서 고른 사진들.
export class RemoveTeamGalleryPhotosDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  imageIds!: string[];
}
