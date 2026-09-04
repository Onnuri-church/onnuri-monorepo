import { ConfigService } from '@nestjs/config';
import { env } from './env.validation';

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
