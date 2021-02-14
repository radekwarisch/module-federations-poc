import { App, Stack, StackProps, SecretValue } from '@aws-cdk/core';
import { Bucket } from "@aws-cdk/aws-s3";

import {PipelineProject, BuildSpec, LinuxBuildImage} from '@aws-cdk/aws-codebuild';
import {Artifact, Pipeline} from '@aws-cdk/aws-codepipeline';
import {GitHubSourceAction, CodeBuildAction, S3DeployAction, GitHubTrigger, CloudFormationCreateUpdateStackAction} from '@aws-cdk/aws-codepipeline-actions';

export class ModuleFederationsPocStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!process.env.GITHUB_TOKEN) {
      console.log("No Github Token present");
    }
    
    const sourceOutput = new Artifact("SrcOutput");
    const cdkBuildOutput = new Artifact('CdkBuildOutput');
    const s3BuildOutput = new Artifact('S3BuildOutput');

    const bucket = Bucket.fromBucketName(this, "WebsiteBucket", 'rwarisch-module-federations-core');

    const githubToken = process.env.GITHUB_TOKEN || "";

    const cdkBuild = new PipelineProject(this, 'CdkBuild', {
      buildSpec: BuildSpec.fromSourceFilename('buildspec_stack.yaml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_4_0,
      },
    });

    const s3Build = new PipelineProject(this, "ModuleFederationPocProject", {
      buildSpec: BuildSpec.fromSourceFilename('buildspec_core.yaml'),
      
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
              actionName: 'S3_Build',
              project: s3Build,
              input: sourceOutput,
              outputs: [s3BuildOutput],
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
            // new S3DeployAction({
            //   actionName: "Deploy",
            //   runOrder: 1,
            //   input: s3BuildOutput,
            //   bucket: bucket,
            // }),
            new CloudFormationCreateUpdateStackAction({
              actionName: 'CloudFormationCreateUpdateStackAction',
              templatePath: cdkBuildOutput.atPath('ModuleFederationsPocStack.template.json'),
              stackName: 'ModuleFederationsPocStack',
              adminPermissions: true
            }),
          ],
        },
      ],
    });
  }
}
