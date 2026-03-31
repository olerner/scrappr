import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export class CiStack extends cdk.Stack {
  public readonly roleArn: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── GitHub OIDC Provider ──────────────────────────────────────────

    const oidcProvider = new iam.OpenIdConnectProvider(this, "GitHubOidc", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
    });

    // ── IAM Role for GitHub Actions ─────────────────────────────────

    const role = new iam.Role(this, "GitHubActionsRole", {
      roleName: "scrappr-github-actions",
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": "repo:olerner/scrappr:*",
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")],
    });

    this.roleArn = role.roleArn;

    // ── Outputs ──────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "RoleArn", {
      value: role.roleArn,
      description: "IAM role ARN for GitHub Actions OIDC",
    });

    // ── SSM Parameters ───────────────────────────────────────────────
    // The following parameters must be created manually via AWS CLI
    // before the deploy workflow can read them:
    //
    // aws ssm put-parameter --name /scrappr/ci/google-client-id --type SecureString --value "..."
    // aws ssm put-parameter --name /scrappr/ci/google-client-secret --type SecureString --value "..."
    // aws ssm put-parameter --name /scrappr/ci/google-places-api-key --type SecureString --value "..."
    // aws ssm put-parameter --name /scrappr/ci/vite-user-pool-id --type String --value "..."
    // aws ssm put-parameter --name /scrappr/ci/vite-user-pool-client-id --type String --value "..."
    // aws ssm put-parameter --name /scrappr/ci/vite-cognito-domain --type String --value "..."
  }
}
