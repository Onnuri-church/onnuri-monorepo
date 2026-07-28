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
  };
};

export default configuration;
export type AppConfig = ReturnType<typeof configuration>;
export type TypedConfigService = ConfigService<AppConfig, true>;
