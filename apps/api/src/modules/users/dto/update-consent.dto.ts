import { Equals, IsBoolean, IsOptional } from 'class-validator';

// PATCH /users/me/consent — 계약은 @onnuri/shared의 UpdateConsentRequest.
// 필수 동의는 철회 대신 회원탈퇴로 하므로 true만 받는다.
export class UpdateConsentDto {
  @IsOptional()
  @Equals(true)
  privacy?: true;

  @IsOptional()
  @IsBoolean()
  sensitive?: boolean;
}
