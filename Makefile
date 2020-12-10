NAME=push
VERSION=$(shell cat package.json | grep version | head -1 | sed 's/.*: "\([^"]*\)".*/\1/')
REGISTRY_PREFIX=fish.co:8001/

# .PHONY: build publish version

build:
	docker build -t ${NAME}:${VERSION} .

publish:
	docker tag ${NAME}:${VERSION} ${REGISTRY_PREFIX}${NAME}:${VERSION}
	docker push ${REGISTRY_PREFIX}${NAME}:${VERSION}

version:
	@echo ${VERSION}
