import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import { DockerImageAsset } from "@aws-cdk/aws-ecr-assets";
import { join } from 'path';
export class AwsWorkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const APP_PORT = 80
    const pathToDockerFile = join(process.cwd(), "./gasket-frontend");

    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 2,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "MyTaskDefinition", {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const dockerFile = new DockerImageAsset(this, 'DockerFileAsset', {
      directory: pathToDockerFile,
      file: 'Dockerfile',
    });

    // cdk will build it and push it to en ecr repository
    const image = ecs.ContainerImage.fromDockerImageAsset(dockerFile);

    const container = taskDefinition.addContainer("MyContainer", {
      image,
      // store the logs in cloudwatch 
      logging: ecs.LogDriver.awsLogs({ streamPrefix: "myexample-logs" })
    });

    container.addPortMappings({
      containerPort: APP_PORT,
    });

    const cluster = new ecs.Cluster(this, "MyECSCluster", {
      clusterName: "MyECSCluster",
      containerInsights: true,
      vpc,
    });

    const securityGroup = new ec2.SecurityGroup(this, `My-security-group`, {
      vpc: vpc,
      allowAllOutbound: true,
      description: 'My Security Group'
    });

    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(APP_PORT));

    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'MyFargateService', {
      cluster,
      publicLoadBalancer: true,
      cpu: 256,
      desiredCount: 1,
      memoryLimitMiB: 512,
      taskDefinition,
      securityGroups: [securityGroup]
    })

    const scalableTarget = fargateService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 2
    })

    scalableTarget.scaleOnCpuUtilization('cpuScaling', {
      targetUtilizationPercent: 70
    })
  }
}
