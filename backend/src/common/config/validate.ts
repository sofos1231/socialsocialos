import Joi from 'joi';

export interface AppConfig {
  PORT: number;
  DATABASE_URL: string;
  NODE_EXTRA_CA_CERTS?: string;
  REDIS_URL?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
}

const schema = Joi.object<AppConfig>({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  NODE_EXTRA_CA_CERTS: Joi.string().optional(),
  REDIS_URL: Joi.string().uri().optional(),
  S3_BUCKET: Joi.string().optional(),
  S3_REGION: Joi.string().optional(),
  S3_ACCESS_KEY: Joi.string().optional(),
  S3_SECRET_KEY: Joi.string().optional(),
})
  .unknown(true);

export function validateEnv(config: Record<string, unknown>): AppConfig {
  const { error, value } = schema.validate(config, { abortEarly: false });
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
  return value as AppConfig;
}


