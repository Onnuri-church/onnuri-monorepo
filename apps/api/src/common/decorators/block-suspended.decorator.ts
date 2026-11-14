import { SetMetadata } from '@nestjs/common';

export const BLOCK_SUSPENDED_KEY = 'blockSuspended';

/** 이용 정지된 사람은 부를 수 없다 (SCRUM-204) — 글·댓글·채팅·사진을 새로 쓰거나 고치는 핸들러에 붙인다. */
export const BlockSuspended = () => SetMetadata(BLOCK_SUSPENDED_KEY, true);
