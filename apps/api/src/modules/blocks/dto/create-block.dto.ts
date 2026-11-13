import { IsString, MaxLength } from 'class-validator';

export class CreateBlockDto {
  @IsString()
  @MaxLength(50)
  userId: string;
}
