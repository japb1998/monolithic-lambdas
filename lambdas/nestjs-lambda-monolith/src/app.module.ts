import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'RECORD_TABLE',
      useFactory: (configService: ConfigService) => {
        return configService.getOrThrow<string>('RECORD_TABLE');
      },
      inject: [ConfigService],
    },
    {
      useFactory: (configService: ConfigService) => {
        return new DynamoDB({
          region: configService.get<string>('AWS_REGION') ?? 'us-east-1',
        });
      },
      provide: 'DYNAMO_CLIENT',
      inject: [ConfigService],
    },
  ],
})
export class AppModule {}
