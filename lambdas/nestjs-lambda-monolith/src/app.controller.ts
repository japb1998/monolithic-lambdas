import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { DynamoRecord } from './types';
@Controller('records')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRecords(): Promise<DynamoRecord[]> {
    return this.appService.getRecords();
  }

  @HttpCode(201)
  @Post()
  createRecord(@Body() record: DynamoRecord): Promise<void> {
    return this.appService.createRecord(record);
  }
}
