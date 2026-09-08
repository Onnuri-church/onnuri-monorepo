import type { DevLoginRole } from '@onnuri/shared';
import { IsEmail, IsIn, IsOptional } from 'class-validator';

// 백엔드는 @onnuri/shared에서 타입만 가져온다(런타임 값 금지) — shared는 빌드 없이 TS 소스를
// 그대로 노출해서 Node가 실행 시점에 못 읽는다 (ARCHITECTURE.md 참고). 그래서 검증용 배열은
// 여기 두고, satisfies로 shared의 DevLoginRole과 어긋나면 컴파일에서 잡는다.
const DEV_LOGIN_ROLES = [
  'MEMBER',
  'TEAM_LEADER',
  'CELL_LEADER',
  'ADMIN',
] as const satisfies readonly DevLoginRole[];

export class DevLoginDto {
  @IsEmail()
  email: string;

  // 로그인하면서 세팅할 역할 — 생략하면 MEMBER (아무것도 세팅하지 않음).
  @IsOptional()
  @IsIn(DEV_LOGIN_ROLES)
  role?: DevLoginRole;
}
