import { Amplify } from "aws-amplify";
import {
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from "aws-amplify/auth";
import { awsConfig, isAwsAuthConfigured } from "./awsConfig";

if (isAwsAuthConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: awsConfig.userPoolId,
        userPoolClientId: awsConfig.userPoolClientId,
        loginWith: { email: true },
      },
    },
  });
}

function requireCognitoConfig() {
  if (!isAwsAuthConfigured) {
    throw new Error("Cognito is not configured. Set the VITE_COGNITO_* values in .env.local.");
  }
}

export async function login(email: string, password: string) {
  requireCognitoConfig();
  return signIn({ username: email, password });
}

export async function register(email: string, password: string, name: string) {
  requireCognitoConfig();
  return signUp({
    username: email,
    password,
    options: { userAttributes: { email, ...(name ? { name } : {}) } },
  });
}

export async function confirmRegistration(email: string, code: string) {
  requireCognitoConfig();
  return confirmSignUp({ username: email, confirmationCode: code });
}

export async function logout() {
  if (isAwsAuthConfigured) await signOut();
}

export async function currentUser() {
  if (!isAwsAuthConfigured) return null;
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function accessToken() {
  if (!isAwsAuthConfigured) return null;
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() ?? null;
  } catch {
    return null;
  }
}