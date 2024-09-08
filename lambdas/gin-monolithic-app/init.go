package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"regexp"

	"github.com/aws/aws-sdk-go-v2/config"
	ginadapter "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-gonic/gin"
)

var ginLambda *ginadapter.GinLambda
var r *gin.Engine
var handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{}).WithAttrs([]slog.Attr{slog.String("service", os.Getenv("AWS_LAMBDA_FUNCTION_NAME"))})
var logger = slog.New(handler)

func init() {

	c, err := config.LoadDefaultConfig(context.TODO())

	if err != nil {
		panic(err)
	}

	dbClient := NewDynamoClient(c)
	svc := NewRecordSvc(dbClient)
	controller := NewRecordController(svc)

	r = gin.Default()

	// base route resource
	base := os.Getenv("API_GW_RESOURCE_PATH")
	if !validateApiGwResourcePath(base) {
		panic(fmt.Sprintf("invalid resource path was provided path=%s", base))
	}
	records := r.Group(fmt.Sprintf("%s/records", base))
	records.GET("", controller.GetRecords)
	records.POST("", controller.CreateRecord)

	ginLambda = ginadapter.New(r)
}

func validateApiGwResourcePath(path string) bool {
	reg, err := regexp.Compile(`^\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$`)

	if err != nil {
		panic(err)
	}
	return reg.Match([]byte(path))
}
