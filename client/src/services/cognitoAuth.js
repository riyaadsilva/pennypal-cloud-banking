import {
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  fetchAuthSession,
  signOut,
} from "aws-amplify/auth";

export async function cognitoSignUp(username, email, password) {
  return signUp({
    username,
    password,
    options: {
      userAttributes: {
        email,
      },
    },
  });
}

export async function cognitoConfirmSignUp(username, code) {
  return confirmSignUp({
    username,
    confirmationCode: code,
  });
}

export async function cognitoResendCode(username) {
  return resendSignUpCode({ username });
}

export async function cognitoSignIn(username, password) {
  const result = await signIn({ username, password });

  if (!result.isSignedIn) {
    return result;
  }

  return cognitoCreatePennyPalSession();
}

export async function cognitoCreatePennyPalSession() {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    throw new Error("Cognito authentication token is missing.");
  }

  return idToken;
}

export async function cognitoSignOut() {
  await signOut();
}
