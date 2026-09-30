export const awsConfig = {
  apiUrl: (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, ""),
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "",
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
  region: import.meta.env.VITE_AWS_REGION ?? "ap-southeast-2",
};

export const isAwsAuthConfigured = Boolean(
  awsConfig.userPoolId && awsConfig.userPoolClientId,
);