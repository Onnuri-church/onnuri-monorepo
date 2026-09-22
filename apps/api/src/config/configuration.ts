import { ConfigService } from '@nestjs/config';
import { env } from './env.validation';

// 공용 Supabase의 프로젝트 주소는 DATABASE_URL 사용자명(postgres.<ref>)에 들어 있어서
// 따로 안 적어도 만들 수 있다 — SUPABASE_URL을 명시하면 그 값이 우선한다.
function deriveSupabaseUrl(databaseUrl: string): string | null {
  try {
    const username = new URL(databaseUrl).username; // "postgres.<ref>"
    const ref = username.split('.')[1];
    return ref ? `https://${ref}.supabase.co` : null;
  } catch {
    return null;
  }
}

const configuration = () => {
  const e = env();
  return {
    port: e.PORT,
    database: {
      url: e.DATABASE_URL,
    },
    jwt: {
      accessSecret: e.JWT_ACCESS_SECRET,
      refreshSecret: e.JWT_REFRESH_SECRET,
      accessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: e.JWT_REFRESH_EXPIRES_IN,
    },
    auth: {
      // 개발용 로그인 — 명시적으로 켠 환경에서만 (기본 꺼짐, 운영 금지)
      devLoginEnabled: e.AUTH_DEV_LOGIN === 'true',
    },
    storage: {
      url: e.SUPABASE_URL || deriveSupabaseUrl(e.DATABASE_URL),
      // 비어 있으면 업로드 API가 503 — 키를 받아 채우기 전까지 나머지 기능은 정상 동작
      serviceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY || null,
      bucket: e.SUPABASE_STORAGE_BUCKET || 'uploads',
    },
    oauth: {
      kakaoAppId: e.KAKAO_APP_ID || null, // 빈 문자열도 미설정으로 취급
      kakaoRestApiKey: e.KAKAO_REST_API_KEY || null,
      kakaoClientSecret: e.KAKAO_CLIENT_SECRET || null,
      googleClientIds:
        e.GOOGLE_CLIENT_IDS?.split(',')
          .map((id) => id.trim())
          .filter(Boolean) ?? [],
    },
  };
};

export default configuration;
export type AppConfig = ReturnType<typeof configuration>;
export type TypedConfigService = ConfigService<AppConfig, true>;
