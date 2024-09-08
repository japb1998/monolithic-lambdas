import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import { Handler, Context, Callback } from 'aws-lambda';

let server: Handler;
async function bootstrap(): Promise<any> {
  const app = await NestFactory.create(AppModule);

  if (process.env.STAGE?.includes('local')) {
    return await initLocalApp(app);
  } else {
    return await initServerless(app);
  }
}
bootstrap();

async function initServerless(app: INestApplication) {
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

async function initLocalApp(app: INestApplication) {
  await app.listen(3000);
}

// only runs in AWS Lambda
export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
