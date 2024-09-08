import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  AttributeValue,
  DynamoDB,
  PutItemInput,
  ScanCommandInput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoRecord } from './types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AppService {
  logger = new Logger(AppService.name);

  constructor(
    @Inject('DYNAMO_CLIENT') private dynamodb: DynamoDB,
    @Inject('RECORD_TABLE') private recordTable: string,
  ) {}

  async getRecords() {
    this.logger.debug('getting records');

    let lastEvaluatedKey: Record<string, AttributeValue> | undefined =
      undefined;
    const records: DynamoRecord[] = [];
    const input: ScanCommandInput = {
      TableName: this.recordTable,
      ExclusiveStartKey: lastEvaluatedKey,
    };
    do {
      if (lastEvaluatedKey) input.ExclusiveStartKey = lastEvaluatedKey;

      let Items: Record<string, AttributeValue>[] = [];
      let LastEvaluatedKey: Record<string, AttributeValue> | undefined;

      try {
        const output = await this.dynamodb.scan(input);
        Items = output.Items ?? [];
        LastEvaluatedKey = output.LastEvaluatedKey;
      } catch (error) {
        this.logger.error('error getting records', { error });
        throw new InternalServerErrorException('failed to get records');
      }

      this.logger.debug('got items', { count: Items.length });
      lastEvaluatedKey = LastEvaluatedKey;
      records.push(...Items.map((item) => unmarshall(item) as DynamoRecord));
    } while (lastEvaluatedKey);

    this.logger.log('got records', { count: records.length });
    return records;
  }

  async createRecord(record: DynamoRecord) {
    this.logger.debug('creating record', { record });
    record.id = uuid();

    const input: PutItemInput = {
      TableName: this.recordTable,
      Item: marshall(record, {
        removeUndefinedValues: true,
      }),
      ConditionExpression: 'attribute_not_exists(id)',
    };

    try {
      await this.dynamodb.putItem(input);
    } catch (error) {
      this.logger.error('error creating record', { error });
      throw new InternalServerErrorException('failed to create record');
    }
  }
}
