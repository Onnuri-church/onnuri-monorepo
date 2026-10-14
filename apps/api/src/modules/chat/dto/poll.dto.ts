import { ArrayMaxSize, IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// PUT /chat-polls/:pollId/votes 요청 본문 — 내 선택 전체를 교체한다 (빈 배열 = 투표 취소).
export class VoteChatPollDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  optionIds!: string[];
}

// POST /chat-polls/:pollId/options 요청 본문 — 항목 추가를 허용한 투표만.
export class AddChatPollOptionDto {
  @IsString()
  @IsNotEmpty({ message: '항목을 입력해주세요.' })
  @MaxLength(50, { message: '항목은 50자까지 쓸 수 있어요.' })
  text!: string;
}
