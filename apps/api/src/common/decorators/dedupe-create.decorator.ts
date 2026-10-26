import { SetMetadata } from '@nestjs/common';

export const DEDUPE_CREATE_KEY = 'dedupeCreate';

// 글·방·팀처럼 "만들기" 성격의 POST에 붙인다. 같은 사용자가 같은 주소로 똑같은 내용을
// 짧은 시간 안에 다시 보내면 새로 만들지 않고 먼저 처리한 결과를 돌려준다
// (DedupeCreateInterceptor). 응답이 유실돼 앱이 오류로 보고 다시 누르는 경우를 막는다.
export const DedupeCreate = () => SetMetadata(DEDUPE_CREATE_KEY, true);
