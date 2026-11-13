import { IsIn } from 'class-validator';

export class HandleReportDto {
  @IsIn(['hide', 'dismiss'])
  action: 'hide' | 'dismiss';
}
