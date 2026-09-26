import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

// PATCH /users/me/avatar 요청 본문 — 계약은 @onnuri/shared의 UpdateMyAvatarRequest.
// null은 "사진 제거". 필드 자체가 빠진 것(undefined)은 IsString이 걸러 400이다.
export class UpdateMyAvatarDto {
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsNotEmpty()
  avatarUrl!: string | null;
}
