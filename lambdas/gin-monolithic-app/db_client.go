package main

import (
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

func NewDynamoClient(config aws.Config) *dynamodb.Client {
	return dynamodb.NewFromConfig(config)
}
