import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// POST /teams/:id/messages 요청 본문 — 계약은 @onnuri/shared의 CreateTeamMessageRequest.
export class CreateTeamMessageDto {
  @IsString()
  @IsNotEmpty({ message: '내용을 입력해주세요.' })
  @MaxLength(1000, { message: '메시지는 1000자까지 보낼 수 있어요.' })
  content!: string;
}
