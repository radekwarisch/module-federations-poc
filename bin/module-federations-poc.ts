#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ModuleFederationsPocStack } from '../cdk/module-federations-poc-stack';

const app = new cdk.App();
new ModuleFederationsPocStack(app, 'ModuleFederationsPocStack');
