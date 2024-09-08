package main

import (
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"
)

type RecordController struct {
	svc *RecordSvc
}

func NewRecordController(svc *RecordSvc) *RecordController {
	return &RecordController{
		svc,
	}
}
func (c *RecordController) GetRecords(ctx *gin.Context) {
	logger.Info("get records")
	records, err := c.svc.GetRecords(ctx.Request.Context())

	if err != nil {
		ctx.AbortWithError(500, err)
		return
	}

	ctx.JSON(200, records)
}

func (c *RecordController) CreateRecord(ctx *gin.Context) {
	logger.Info("creating record")
	var record CreateRecord

	if err := ctx.BindJSON(&record); err != nil {

		logger.Error("failed to decode body", slog.String("error", err.Error()))
		ctx.AbortWithError(400, errors.New("invalid json"))
		return
	}
	logger.Debug("record", slog.Any("record", record))

	err := c.svc.CreateRecord(ctx.Request.Context(), record)

	if err != nil {
		if errors.Is(err, ErrFailedMarshall) {
			ctx.AbortWithError(400, err)
		} else if errors.Is(err, ErrCreateRecord) {
			ctx.AbortWithError(500, ErrCreateRecord)
		}
		return
	}
	ctx.Status(201)
}
