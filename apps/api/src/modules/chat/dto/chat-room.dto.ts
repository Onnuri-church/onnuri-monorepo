import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

// POST /teams/:teamId/chat-rooms 요청 본문 — 계약은 @onnuri/shared의 CreateChatRoomRequest.
export class CreateChatRoomDto {
  @IsString()
  @IsNotEmpty({ message: '단톡방 이름을 입력해주세요.' })
  @MaxLength(30, { message: '단톡방 이름은 30자까지 쓸 수 있어요.' })
  name!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  memberIds!: string[];
}

// PATCH /chat-rooms/:roomId 요청 본문
export class UpdateChatRoomDto {
  @IsString()
  @IsNotEmpty({ message: '단톡방 이름을 입력해주세요.' })
  @MaxLength(30, { message: '단톡방 이름은 30자까지 쓸 수 있어요.' })
  name!: string;
}

// POST /chat-rooms/:roomId/members 요청 본문
export class AddChatRoomMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  userIds!: string[];
}
