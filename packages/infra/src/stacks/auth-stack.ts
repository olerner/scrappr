import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import type { Construct } from "constructs";

interface AuthStackProps extends cdk.StackProps {
  stageName: string;
  googleClientId: string;
  googleClientSecret: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `scrappr-users-${props.stageName}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── Google Identity Provider ────────────────────────────────────

    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, "GoogleProvider", {
      userPool: this.userPool,
      clientId: props.googleClientId,
      clientSecretValue: cdk.SecretValue.unsafePlainText(props.googleClientSecret),
      scopes: ["openid", "email", "profile"],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
      },
    });

    // ── Cognito Hosted UI Domain ────────────────────────────────────

    this.userPoolDomain = this.userPool.addDomain("CognitoDomain", {
      cognitoDomain: {
        domainPrefix: `scrappr-${props.stageName}`,
      },
    });

    // ── App Client (with OAuth) ─────────────────────────────────────

    this.userPoolClient = this.userPool.addClient("AppClient", {
      userPoolClientName: `scrappr-app-${props.stageName}`,
      generateSecret: false,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [
          "scrappr://auth/callback",
          "exp://127.0.0.1:8081/--/auth/callback",
          "http://localhost:8081/auth/callback",
        ],
        logoutUrls: [
          "scrappr://auth/sign-out",
          "exp://127.0.0.1:8081/--/auth/sign-out",
          "http://localhost:8081/auth/sign-out",
        ],
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.GOOGLE],
    });

    // Ensure Google provider is created before the client references it
    this.userPoolClient.node.addDependency(googleProvider);

    // ── Outputs ───────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      exportName: `scrappr-user-pool-id-${props.stageName}`,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      exportName: `scrappr-user-pool-client-id-${props.stageName}`,
    });

    new cdk.CfnOutput(this, "CognitoDomain", {
      value: `${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      exportName: `scrappr-cognito-domain-${props.stageName}`,
    });
  }
}
