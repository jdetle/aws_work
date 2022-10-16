#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsWorkStack } from '../lib/aws_work-stack';

const app = new cdk.App();
new AwsWorkStack(app, 'AwsWorkStack', {});
