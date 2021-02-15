import { App, Stack, StackProps, SecretValue } from '@aws-cdk/core';
import { Bucket } from "@aws-cdk/aws-s3";

import {PipelineProject, BuildSpec, LinuxBuildImage} from '@aws-cdk/aws-codebuild';
import {Artifact, Pipeline} from '@aws-cdk/aws-codepipeline';
import {GitHubSourceAction, CodeBuildAction, S3DeployAction, GitHubTrigger, CloudFormationCreateUpdateStackAction} from '@aws-cdk/aws-codepipeline-actions';
import {StringParameter} from '@aws-cdk/aws-ssm';

export class ModuleFederationsPocStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const githubToken = process.env.GITHUB_TOKEN || StringParameter.valueForStringParameter(
      this, 'cdk_github_public_token'); 
    
    const sourceOutput = new Artifact("SrcOutput");
    const cdkBuildOutput = new Artifact('CdkBuildOutput');

    const s3HomeBuildOutput = new Artifact('S3HomeBuildOutput');
    const s3SearchBuildOutput = new Artifact('S3SearchBuildOutput');
    const s3ProfileBuildOutput = new Artifact('S3ProfileBuildOutput');

    const homeBucket = Bucket.fromBucketName(this, "WebsiteHomeBucket", 'rwarisch-module-federation-home');
    const searchBucket = Bucket.fromBucketName(this, "WebsiteSearchBucket", 'rwarisch-module-federation-search');
    const profileBucket = Bucket.fromBucketName(this, "WebsiteProfileBucket", 'rwarisch-module-federation-profile');

    const cdkBuild = new PipelineProject(this, 'CdkBuild', {
      buildSpec: BuildSpec.fromSourceFilename('buildspec_stack.yaml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0,
      },
    });

    const s3HomeBuild = new PipelineProject(this, "ModuleFederationPocHomeProject", {
      buildSpec: BuildSpec.fromSourceFilename('buildspec_home.yaml'),
      
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0
      }
    });

    const s3ProfileBuild = new PipelineProject(this, "ModuleFederationPocProfileProject", {
      buildSpec: BuildSpec.fromSourceFilename('buildspec_profile.yaml'),
      
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0
      }
    });

    const s3SearchBuild = new PipelineProject(this, "ModuleFederationPocSearchProject", {
      buildSpec: BuildSpec.fromSourceFilename('buildspec_search.yaml'),
      
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0
      }
    });

    new Pipeline(this, 'Pipeline', {
      restartExecutionOnUpdate: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              actionName: 'Checkout',
              output: sourceOutput,
              owner: "radekwarisch",
              repo: "module-federations-poc",
              branch: 'main',
              oauthToken: SecretValue.plainText(githubToken),
              trigger: GitHubTrigger.WEBHOOK,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              actionName: 'S3_Home_Build',
              project: s3HomeBuild,
              input: sourceOutput,
              outputs: [s3HomeBuildOutput],
            }),
            new CodeBuildAction({
              actionName: 'S3_Search_Build',
              project: s3SearchBuild,
              input: sourceOutput,
              outputs: [s3SearchBuildOutput],
            }),
            new CodeBuildAction({
              actionName: 'S3_Profile_Build',
              project: s3ProfileBuild,
              input: sourceOutput,
              outputs: [s3ProfileBuildOutput],
            }),
            new CodeBuildAction({
              actionName: 'CDK_Build',
              project: cdkBuild,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy',
          actions: [
            new S3DeployAction({
              actionName: "DeployHome",
              runOrder: 1,
              input: s3HomeBuildOutput,
              bucket: homeBucket,
            }),
            new S3DeployAction({
              actionName: "DeployProfile",
              runOrder: 1,
              input: s3ProfileBuildOutput,
              bucket: profileBucket,
            }),
            new S3DeployAction({
              actionName: "DeploySearch",
              runOrder: 1,
              input: s3SearchBuildOutput,
              bucket: searchBucket,
            }),
            new CloudFormationCreateUpdateStackAction({
              actionName: 'ModuleFederationsPocStackUpdate',
              templatePath: cdkBuildOutput.atPath('ModuleFederationsPocStack.template.json'),
              stackName: 'ModuleFederationsPocStack',
              adminPermissions: true,
              runOrder: 2
            }),
          ],
        },
      ],
    });
  }
}
