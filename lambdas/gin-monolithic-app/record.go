package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

// errors
var (
	ErrFailedMarshall = errors.New("failed to marshall record")
	ErrCreateRecord   = errors.New("failed to create record")
)

type Record struct {
	Id          string    `json:"id" dynamodbav:"id"`
	Name        string    `json:"name" dynamodbav:"name"`
	Description string    `json:"description" dynamodbav:"description"`
	CreatedAt   time.Time `json:"created_at" dynamodbav:"created_at"`
}

type CreateRecord struct {
	Name        string `json:"name" dynamodbav:"name"`
	Description string `json:"description" dynamodbav:"description"`
}

func (cr *CreateRecord) toRecord() Record {
	return Record{
		Id:          uuid.NewString(),
		Name:        cr.Name,
		Description: cr.Description,
		CreatedAt:   time.Now().UTC(),
	}
}

type RecordSvc struct {
	db *dynamodb.Client
}

func NewRecordSvc(db *dynamodb.Client) *RecordSvc {
	return &RecordSvc{
		db: db,
	}
}

func (s *RecordSvc) GetRecords(ctx context.Context) ([]Record, error) {
	var lastEvaluatedKey map[string]types.AttributeValue
	records := make([]Record, 0)
	for {
		input := &dynamodb.ScanInput{
			TableName:         aws.String(os.Getenv("RECORD_TABLE")),
			ExclusiveStartKey: lastEvaluatedKey,
		}

		out, err := s.db.Scan(ctx, input)

		if err != nil {
			logger.Error("error getting records", slog.String("error", err.Error()))
			return nil, errors.New("failed to get records")
		}

		var items []Record

		err = attributevalue.UnmarshalListOfMaps(out.Items, &items)

		if err != nil {
			logger.Error("error getting records", slog.String("error", err.Error()))
			return nil, errors.New("failed to get records")
		}
		logger.Info("got items", slog.Int("count", len(items)))
		records = append(records, items...)
		if out.LastEvaluatedKey == nil {
			break
		}
		lastEvaluatedKey = out.LastEvaluatedKey
	}
	logger.Info("got records", slog.Int("count", len(records)))
	return records, nil
}

func (s *RecordSvc) CreateRecord(ctx context.Context, newRecord CreateRecord) error {
	item, err := attributevalue.MarshalMap(newRecord.toRecord())

	if err != nil {
		logger.Error("failed to marshall record", slog.String("error", err.Error()))
		return ErrFailedMarshall
	}
	input := &dynamodb.PutItemInput{
		TableName:           aws.String(os.Getenv("RECORD_TABLE")),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(id)"),
	}

	_, err = s.db.PutItem(ctx, input)

	if err != nil {
		logger.Error("failed to put item", slog.String("error", err.Error()))
		return ErrCreateRecord
	}
	return nil
}
