import { plainToInstance } from 'class-transformer';
import {
  IsIn,
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

  // 비어 있으면 카카오 토큰의 발급 앱(app_id) 검증을 건너뛴다 (로컬 개발용).
  @ValidateIf((e: EnvironmentVariables) => Boolean(e.KAKAO_APP_ID))
  @Matches(/^\d+$/, { message: 'KAKAO_APP_ID는 숫자여야 합니다.' })
  KAKAO_APP_ID?: string;

  // 인가 코드 로그인(code → 토큰 교환)에만 필요하다. SDK 토큰 로그인은 없이도 동작한다.
  @IsOptional()
  @IsString()
  KAKAO_REST_API_KEY?: string;

  // 카카오 콘솔 보안 메뉴에서 Client Secret을 활성화한 경우 코드 교환에 필수다.
  @IsOptional()
  @IsString()
  KAKAO_CLIENT_SECRET?: string;

  // 개발용 로그인(POST /auth/login/dev) 스위치 — 기본 꺼짐. 운영에서는 절대 켜지 않는다.
  @ValidateIf((e: EnvironmentVariables) => Boolean(e.AUTH_DEV_LOGIN))
  @IsIn(['true'], {
    message:
      'AUTH_DEV_LOGIN은 "true"만 허용됩니다 (끄려면 값을 비우거나 제거).',
  })
  AUTH_DEV_LOGIN?: string;

  // 개발용 로그인을 켜면 필수 — 요청의 X-Dev-Login-Secret 헤더가 이 값과 같아야 로그인된다.
  // 개발 서버 주소만 알면 누구나 관리자 토큰을 받을 수 있던 문제를 막는다 (openssl rand -hex 32).
  @ValidateIf((e: EnvironmentVariables) => Boolean(e.AUTH_DEV_LOGIN))
  @IsString()
  @MinLength(32, {
    message:
      'AUTH_DEV_LOGIN_SECRET은 32자 이상이어야 합니다 (AUTH_DEV_LOGIN을 켰을 때 필수).',
  })
  AUTH_DEV_LOGIN_SECRET?: string;

  // 스토어 심사용 로그인(POST /auth/login/review) 아이디·비밀번호 (SCRUM-197).
  // 앱스토어·플레이 콘솔 심사 정보에 적는 값. 아이디를 넣으면 비밀번호(12자 이상)가 필수다.
  @IsOptional()
  @IsString()
  REVIEW_LOGIN_ID?: string;

  @ValidateIf((e: EnvironmentVariables) => Boolean(e.REVIEW_LOGIN_ID))
  @IsString()
  @MinLength(12, {
    message:
      'REVIEW_LOGIN_PASSWORD는 12자 이상이어야 합니다 (REVIEW_LOGIN_ID를 넣었을 때 필수).',
  })
  REVIEW_LOGIN_PASSWORD?: string;

  // 쉼표 구분 목록 (Android/iOS 클라이언트 ID가 다르다).
  // 비어 있으면 구글 ID 토큰의 aud 검증을 건너뛴다 (로컬 개발용).
  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_IDS?: string;

  // Supabase Storage (이미지 업로드) — SERVICE_ROLE_KEY가 비어 있으면 업로드 API가
  // 503을 돌려준다 (나머지 기능은 정상). URL은 비워두면 DATABASE_URL의 프로젝트
  // ref(postgres.<ref>)에서 https://<ref>.supabase.co 를 만들어 쓴다.
  @ValidateIf((e: EnvironmentVariables) => Boolean(e.SUPABASE_URL))
  @Matches(/^https:\/\//, {
    message: 'SUPABASE_URL은 https:// 로 시작해야 합니다.',
  })
  SUPABASE_URL?: string;

  @IsOptional()
  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // 앱 강제 업데이트 (SCRUM-193) — 이 버전보다 낮은 앱은 "업데이트가 필요해요" 화면만 본다.
  // 비우면 강제하지 않는다. 스토어 주소는 그 화면의 버튼이 연다 (없으면 버튼 없이 안내만).
  @IsOptional()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: "APP_MIN_VERSION은 '1.2.3' 형식이어야 합니다.",
  })
  APP_MIN_VERSION?: string;

  @IsOptional()
  @Matches(/^https:\/\//, {
    message: 'APP_ANDROID_STORE_URL은 https:// 로 시작해야 합니다.',
  })
  APP_ANDROID_STORE_URL?: string;

  @IsOptional()
  @Matches(/^https:\/\//, {
    message: 'APP_IOS_STORE_URL은 https:// 로 시작해야 합니다.',
  })
  APP_IOS_STORE_URL?: string;

  // 업로드 파일을 담을 버킷 이름 — 없으면 첫 업로드 때 public 버킷으로 자동 생성한다.
  @IsOptional()
  @IsString()
  SUPABASE_STORAGE_BUCKET?: string;

  // 말씀 게시판 영상 동기화(유튜브 채널 → DB)용 YouTube Data API 키.
  // 비어 있으면 동기화만 건너뛴다 (이미 들어온 영상 조회는 정상).
  @IsOptional()
  @IsString()
  YOUTUBE_API_KEY?: string;

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
  // ConfigModule은 .env 파일 값만 넘긴다. 운영(Render 등)은 .env 없이 플랫폼 환경변수로
  // 값을 주입하므로 process.env도 함께 검증한다 — .env 파일 값이 우선한다.
  const source = { ...process.env, ...config };
  const instance = plainToInstance(EnvironmentVariables, source, {
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
