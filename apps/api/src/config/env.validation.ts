import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsString,
  Matches,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsInt()
  @Min(1)
  PORT: number;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL은 postgresql:// 로 시작해야 합니다.',
  })
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET은 32자 이상이어야 합니다.' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET은 32자 이상이어야 합니다.' })
  JWT_REFRESH_SECRET: string;

  @Matches(/^\d+[smhd]$/, {
    message: "JWT_ACCESS_EXPIRES_IN은 '15m', '1h' 형식이어야 합니다.",
  })
  JWT_ACCESS_EXPIRES_IN: string;

  @Matches(/^\d+[smhd]$/, {
    message: "JWT_REFRESH_EXPIRES_IN은 '30d' 형식이어야 합니다.",
  })
  JWT_REFRESH_EXPIRES_IN: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.map((error) => {
      const constraints = Object.values(error.constraints ?? {}).join(', ');
      return `  - ${error.property}: ${constraints}`;
    });
    throw new Error(`환경변수 검증에 실패했습니다.\n${messages.join('\n')}`);
  }

  return validated;
}