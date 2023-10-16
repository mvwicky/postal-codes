set shell := ["bash", "-uc"]

deps_files := "deps.ts dev_deps.ts"
entry_files := "main.ts cli.ts"
deno := "deno"
podman := "podman"
img_name := "postal-codes"
dockerfile := "Dockerfile"

build-image:
    {{ podman }} build --file {{ dockerfile }} --tag {{ img_name }}

create-container:
    {{ podman }} create --name {{ img_name }} localhost/{{ img_name }}:latest

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
