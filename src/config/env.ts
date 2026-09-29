import dotenv from 'dotenv';

dotenv.config();

/**
 * Required environment variables for the application.
 * If any of these are missing, the application will throw an error immediately.
 */
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'OPENAI_API_KEY'
];

const validateEnv = () => {
  const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Please check your .env file.`
    );
  }
};

// Run validation immediately on module load
validateEnv();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGODB_URI: process.env.MONGODB_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY!,
  },
};

console.log(`✅ Environment variables validated for ${ENV.NODE_ENV} mode.`);
