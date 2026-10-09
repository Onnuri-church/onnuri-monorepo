import { IsBoolean } from 'class-validator';

// PUT /notices/banners/:id/active 요청 본문 — true=홈에 게시(다른 배너는 꺼짐), false=내리기.
export class SetBannerActiveDto {
  @IsBoolean()
  active!: boolean;
}
