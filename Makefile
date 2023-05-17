SHELL:=bash
.SHELLFLAGS:=-euo pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

PODMAN=podman
DENO=deno
IMG_NAME=postal-codes
DOCKERFILE=Dockerfile

DEPS_FILES=deps.ts dev_deps.ts dev.ts fresh.gen.ts main.ts twind.config.ts
CACHE_DEPS_ARGS=$(DEPS_FILES)
ENTRY_FILES=serve.ts cli.ts

.PHONY: build-image create-container start-container stop-container rm-container \
	cache-deps reload-deps check

build-image:
	$(PODMAN) build --file $(DOCKERFILE) --tag $(IMG_NAME)

create-container:
	$(PODMAN) create --name $(IMG_NAME) localhost/$(IMG_NAME):latest

start-container:
	$(PODMAN) start $(IMG_NAME)

stop-container:
	$(PODMAN) stop $(IMG_NAME)

rm-container:
	$(PODMAN) rm $(IMG_NAME)

cache-deps: deno.lock

deno.lock: deno.json $(DEPS_FILES)
	$(DENO) cache --lock-write $(DEPS_FILES)

reload-deps:
	$(DENO) cache --lock-write --reload $(DEPS_FILES)

check:
	$(DENO) check $(ENTRY_FILES)
