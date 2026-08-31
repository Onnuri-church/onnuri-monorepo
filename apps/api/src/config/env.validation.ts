import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
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

  // 비어 있으면 Sentry 전송이 꺼진다. 값이 있을 때만 형식을 검사한다.
  @ValidateIf((e: EnvironmentVariables) => Boolean(e.SENTRY_DSN))
  @Matches(/^https:\/\/[^@]+@[^/]+\/\d+$/, {
    message: 'SENTRY_DSN 형식이 올바르지 않습니다.',
  })
  SENTRY_DSN?: string;

  @IsOptional()
  @IsString()
  SENTRY_ENVIRONMENT?: string;
}

let validated: EnvironmentVariables | undefined;

export function validate(config: Record<string, unknown>) {
  const instance = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(instance, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.map((error) => {
      const constraints = Object.values(error.constraints ?? {}).join(', ');
      return `  - ${error.property}: ${constraints}`;
    });
    throw new Error(`환경변수 검증에 실패했습니다.\n${messages.join('\n')}`);
  }

  validated = instance;
  return instance;
}

export function env(): EnvironmentVariables {
  if (!validated)
    throw new Error('env()는 ConfigModule 초기화 이후에만 호출할 수 있습니다.');
  return validated;
}
