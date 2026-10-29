import { CognitoJwtVerifier } from "aws-jwt-verify";
import { HttpError } from "../utils/errors.js";

const verifier = CognitoJwtVerifier.create({
  userPoolId: "ap-south-1_dVTm286E4",
  tokenUse: "id",
  clientId: "7htvvt93qmtomojv4ovj5va254",
});

export async function verifyCognitoToken(token) {
  if (typeof token !== "string" || !token) {
    throw new HttpError(
      401,
      "COGNITO_TOKEN_REQUIRED",
      "A Cognito authentication token is required."
    );
  }

  let payload;

  try {
    payload = await verifier.verify(token);
  } catch {
    throw new HttpError(
      401,
      "COGNITO_INVALID_TOKEN",
      "Your Cognito session is invalid or expired."
    );
  }

  if (!payload.sub || payload.email_verified !== true) {
    throw new HttpError(
      403,
      "COGNITO_EMAIL_NOT_VERIFIED",
      "Please verify your email address before continuing."
    );
  }

  return payload;
}
