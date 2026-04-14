import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "6gups5rfm8u2tvddoiqqos968g";

const cognito = new CognitoIdentityProviderClient({ region: "us-east-1" });

export interface CognitoTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  email: string;
}

/**
 * Authenticate against Cognito using the USER_PASSWORD_AUTH flow and return
 * the token set. Much faster than filling the sign-in form via the browser.
 */
export async function authenticateWithCognito(
  email: string,
  password: string,
): Promise<CognitoTokens> {
  const result = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  );

  const auth = result.AuthenticationResult;
  if (!auth?.AccessToken || !auth?.IdToken) {
    throw new Error(`Cognito auth failed for ${email}`);
  }

  return {
    accessToken: auth.AccessToken,
    idToken: auth.IdToken,
    refreshToken: auth.RefreshToken ?? "",
    email,
  };
}
