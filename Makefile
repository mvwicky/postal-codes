SHELL:=bash
.SHELLFLAGS:=-euo pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

PODMAN=podman
NAME=postal-codes
DOCKERFILE=Dockerfile

.PHONY: build create start stop clean

build:
	$(PODMAN) build --file $(DOCKERFILE) --tag $(NAME)

create:
	$(PODMAN) create --name $(NAME) localhost/$(NAME):latest

start:
	$(PODMAN) start $(NAME)

stop:
	$(PODMAN) stop $(NAME)

clean:
	$(PODMAN) rm $(NAME)
