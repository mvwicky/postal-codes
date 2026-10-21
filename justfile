set shell := ["bash", "-uc"]

bun := "bun"
podman := "podman"
img_name := "postal-codes"
dockerfile := "Dockerfile"
img_path := "localhost/" + img_name + ":latest"
volume_name := "postal-codes-data"
default_port := "8000"
lock_file := "./bun.lock"

_default:
	@just --list --justfile {{ justfile() }}

dev:
	{{ bun }} run --hot main.ts

[group("containers")]
[doc("Build Docker/Podman image")]
build-image:
	{{ podman }} build --file {{ dockerfile }} --tag {{ img_name }}

[group("containers")]
[doc("Start Docker/Podman image")]
run-image port=default_port: build-image
	{{ podman }} run -p {{ port }}:{{ port }} --rm {{ img_path }}

_run2 port=default_port:
	{{ podman }} run -p {{ port }}:{{ port }} -e CONSOLA_LEVEL=999 -v {{ volume_name }}:/app/data --rm {{ img_path }}

[group("containers")]
[doc("Create Docker/Podman volume")]
data-volume:
	{{ podman }} create {{ volume_name }}

[group("containers")]
[doc("Create Docker/Podman container")]
create-container:
	{{ podman }} create --name {{ img_name }} {{ img_path }}

[group("containers")]
[doc("Start Docker/Podman container")]
start-container:
	{{ podman }} start {{ img_name }}

[group("containers")]
[doc("Stop Docker/Podman container")]
stop-container:
	{{ podman }} stop {{ img_name }}

[group("containers")]
[doc("Destroy Docker/Podman container")]
rm-container:
	{{ podman }} rm {{ img_name }}

[group("bun")]
[doc("Cache bun dependencies")]
cache-deps:
	{{ bun }} install

[group("bun")]
[doc("Cache bun dependencies from scratch")]
reload-deps:
	trash {{ lock_file }}
	{{ bun }} install --force

[group("bun")]
[doc("Run typechecking")]
check:
	{{ bun }} check

[group("bun")]
[doc("Lint files")]
lint:
	{{ bun }} lint .

[group("bun")]
[doc("Run automated tests")]
test:
	{{ bun }} test --bail=1

[group("bun")]
[doc("Run automated tests (with filtering)")]
testf filter:
	{{ bun }} test --bail=1 --test-name-patttern="{{ filter }}"
