export const isTestMode = () => process.env.NEXT_PUBLIC_TEST_MODE === 'true';

export const TEST_MODE_CONFIG = {
  QUESTIONS_COUNT: 6, // Total questions in test mode
  LOGIN_WINDOW_MINUTES: 3, // How long before start can they login
};
