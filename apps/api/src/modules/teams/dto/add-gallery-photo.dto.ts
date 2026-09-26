import { IsNotEmpty, IsString, Matches } from 'class-validator';

// POST /teams/:id/gallery 요청 본문 — url은 POST /uploads가 돌려준 주소.
export class AddTeamGalleryPhotoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^https?:\/\//, { message: 'url은 http(s) 주소여야 합니다.' })
  url!: string;
}
