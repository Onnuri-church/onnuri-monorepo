import { Module } from '@nestjs/common';

import { AppleSignInClient } from './apple-sign-in.client';

// 로그인(Auth)과 탈퇴(Users) 둘 다 쓰는데 Auth가 Users를 import해서, 순환을 피하려고 따로 둔다.
@Module({
  providers: [AppleSignInClient],
  exports: [AppleSignInClient],
})
export class AppleSignInModule {}
