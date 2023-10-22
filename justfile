set shell := ["bash", "-uc"]

deps_files := "deps.ts dev_deps.ts"
entry_files := "main.ts cli.ts"
deno := "deno"
podman := "podman"
img_name := "postal-codes"
dockerfile := "Dockerfile"
img_path := "localhost/" + img_name + ":latest"
default_port := "8000"

default:
    @just --list --justfile {{ justfile() }}

build-image:
    {{ podman }} build --file {{ dockerfile }} --tag {{ img_name }}

run-image port=default_port: build-image
    {{ podman }} run -p {{ port }}:{{ port }} --rm {{ img_path }}

_run2 port=default_port:
    {{ podman }} run -p {{ port }}:{{ port }} -e CONSOLA_LEVEL=999 -v postal-codes-data:/app/data --rm {{ img_path }}

create-container:
    {{ podman }} create --name {{ img_name }} {{ img_path }}

start-container:
    {{ podman }} start {{ img_name }}

stop-container:
    {{ podman }} stop {{ img_name }}

rm-container:
    {{ podman }} rm {{ img_name }}

cache-deps:
    {{ deno }} cache --lock-write {{ deps_files }}

reload-deps:
    {{ deno }} cache --lock-write --reload {{ deps_files }}

check:
    {{ deno }} check {{ entry_files }}

lint:
    {{ deno }} lint .
