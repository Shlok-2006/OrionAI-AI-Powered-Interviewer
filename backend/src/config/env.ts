import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  LIVEKIT_API_KEY: z.string(),
  LIVEKIT_API_SECRET: z.string(),
  LIVEKIT_URL: z.string(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MAX_QUESTIONS_PER_SESSION: z.coerce.number().default(5),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
