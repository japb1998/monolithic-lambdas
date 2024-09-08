.Phony: build
build: build-go
	cd lambdas/nestjs-lambda-monolith && npm run build:webpack
	npm run cdk -- synth --profile=personal 

.Phony: deploy
deploy: build
	npm run cdk -- deploy --profile=personal 

.Phony: destroy
destroy:
	npm run cdk -- destroy --profile=personal 

.Phony: build-go
build-go:
	pwd
	env GOARCH=arm64 GOOS=linux go build -tags lambda.norpc,jsoniter -ldflags="-s -w" -o ./bin/lambdas/gin-monolithic-app/bootstrap ./lambdas/gin-monolithic-app/
	zip -j ./bin/lambdas/gin-monolithic-app/bootstrap.zip ./bin/lambdas/gin-monolithic-app/bootstrap

diff:
	npm run cdk -- diff --profile=personal

k6-init:
	pwd=$(shell pwd)
	echo $(pwd)
	docker run --rm -i -v $(pwd):/app -w /app grafana/k6 new $(TEST_NAME).js

k6-run:
	echo $(shell pwd)
	docker run --env-file .env \
	 --rm -i -v $(shell pwd):/app grafana/k6 run --out json=/app/results.json --verbose -<$(TEST_NAME).js 
