import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import path = require('path');

export class MonolithicLambdasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps, config:   {
    stage: 'dev' | 'prod' | 'qa'
  }) {
    super(scope, id, props);
    const { stage } = config;

    // database
    const recordsTable = new dynamodb.TableV2(this, 'RecordsTable', {
      tableName: 'monolithic-lambdas-record-table',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    
    // lambda role
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      roleName: 'monolithic-lambdas-role',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        xRayAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: 'XRayAccess',
              effect: iam.Effect.ALLOW,
              actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
              ],
              resources: ['*']
            })
          ]
        }),
        databaseAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              sid: 'DynamoDBAccess',
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:*'
              ],
              resources: [recordsTable.tableArn]
            })
          ]
        })
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    })

    //  nestjs lambda
    const nestjsLambdaMonolith = new lambda.Function(this, 'NestJsLambda', {
      functionName: 'nestjs-lambda-monolith',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      role: lambdaRole,
      handler: 'main.handler',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../bin/lambdas/nest-lambda-monolith')),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        STAGE: stage,
        RECORD_TABLE: recordsTable.tableName,
      }
    });
    
    const golangLambda = new lambda.Function(this, 'GolangLambda', {
      functionName: 'gin-lambda-monolith',
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.PROVIDED_AL2023,
      memorySize: 128,
      role: lambdaRole,
      handler: 'ignored',
      code: lambda.Code.fromAsset(path.resolve(__dirname, '../bin/lambdas/gin-monolithic-app/bootstrap.zip'),),
      environment: {
        STAGE: stage,
        RECORD_TABLE: recordsTable.tableName,
        GIN_MODE: 'release',
        API_GW_RESOURCE_PATH: '/golang'
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // API
    const api = new apigw.RestApi(this, 'NestJsLambdaApi', {
      restApiName: 'monolithic-lambdas-api',
      deployOptions: {
        stageName: stage,
        tracingEnabled: true,
      }
    });

    // /nestjs routes
    const nestjsIntegration = new apigw.LambdaIntegration(nestjsLambdaMonolith);
    const nestjsResource = new apigw.Resource(this, 'NestJsLambdaResource', {
      parent: api.root,
      pathPart: 'nestjs'
    });
    nestjsResource.addProxy({
      defaultIntegration: nestjsIntegration,
    });

    // golang routes
    const golangIntegration = new apigw.LambdaIntegration(golangLambda);
    const golangResource = new apigw.Resource(this, 'GolangLambdaResource', {
      parent: api.root,
      pathPart: 'golang'
    });
    golangResource.addProxy({
      defaultIntegration: golangIntegration,
    });
  }
}
