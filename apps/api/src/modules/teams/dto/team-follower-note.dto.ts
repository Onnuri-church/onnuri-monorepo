import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// 팀 팔로워 노트 본문 상한 — 셀 노트 한 칸과 같다 (화면 maxLength와 같다).
export const TEAM_FOLLOWER_NOTE_MAX = 5000;

// POST /teams/:teamId/follower-notes
export class CreateTeamFollowerNoteDto {
  @IsString()
  @IsNotEmpty({ message: '노트 내용을 입력해주세요.' })
  @MaxLength(TEAM_FOLLOWER_NOTE_MAX)
  content!: string;
}

// PATCH /teams/:teamId/follower-notes/:noteId — 팀장 여럿이 같은 노트를 고치므로, 화면이 받은
// updatedAt을 그대로 돌려보내 그 사이 다른 팀장이 고쳤으면 409로 거절한다.
export class UpdateTeamFollowerNoteDto {
  @IsString()
  @IsNotEmpty({ message: '노트 내용을 입력해주세요.' })
  @MaxLength(TEAM_FOLLOWER_NOTE_MAX)
  content!: string;

  @IsISO8601()
  updatedAt!: string;
}

// POST /teams/:teamId/follower-notes/:noteId/comments
export class CreateTeamFollowerNoteCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글 내용을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자 이하여야 합니다.' })
  content!: string;

  /** 대댓글 부모 — 1단계 깊이만 허용 (서비스에서 검증) */
  @IsOptional()
  @IsString()
  parentId?: string;
}

// PATCH /teams/:teamId/follower-notes/:noteId/comments/:commentId
export class UpdateTeamFollowerNoteCommentDto {
  @IsString()
  @IsNotEmpty({ message: '댓글 내용을 입력해주세요.' })
  @MaxLength(1000, { message: '댓글은 1000자 이하여야 합니다.' })
  content!: string;
}
