import { DEV_LOGIN_ROLES, type DevLoginRole } from '@onnuri/shared';
import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class DevLoginDto {
  @IsEmail()
  email: string;

  // 로그인하면서 세팅할 역할 — 생략하면 MEMBER (아무것도 세팅하지 않음).
  @IsOptional()
  @IsIn(DEV_LOGIN_ROLES)
  role?: DevLoginRole;
}
