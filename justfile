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

[doc("Build Docker/Podman image")]
[group("containers")]
build-image:
    {{ podman }} build --file {{ dockerfile }} --tag {{ img_name }}

[doc("Start Docker/Podman image")]
[group("containers")]
run-image port=default_port: build-image
    {{ podman }} run -p {{ port }}:{{ port }} --rm {{ img_path }}

_run2 port=default_port:
    {{ podman }} run -p {{ port }}:{{ port }} -e CONSOLA_LEVEL=999 -v {{ volume_name }}:/app/data --rm {{ img_path }}

[doc("Create Docker/Podman volume")]
[group("containers")]
data-volume:
    {{ podman }} create {{ volume_name }}

[doc("Create Docker/Podman container")]
[group("containers")]
create-container:
    {{ podman }} create --name {{ img_name }} {{ img_path }}

[doc("Start Docker/Podman container")]
[group("containers")]
start-container:
    {{ podman }} start {{ img_name }}

[doc("Stop Docker/Podman container")]
[group("containers")]
stop-container:
    {{ podman }} stop {{ img_name }}

[doc("Destroy Docker/Podman container")]
[group("containers")]
rm-container:
    {{ podman }} rm {{ img_name }}

[doc("Run dev server")]
[group("bun")]
dev:
    {{ bun }} run --hot main.ts

[doc("Build for production")]
[group("bun")]
build:
    {{ bun }} build --target=bun --production --outdir=dist ./main.ts

[doc("Cache bun dependencies")]
[group("bun")]
cache-deps:
    {{ bun }} install

[doc("Cache bun dependencies from scratch")]
[group("bun")]
reload-deps:
    trash {{ lock_file }}
    {{ bun }} install --force

[doc("Run typechecking")]
[group("bun")]
typecheck:
    {{ bun }} check

[doc("Lint files")]
[group("bun")]
lint:
    {{ bun }} x @biomejs/biome check --files-ignore-unknown=true --no-errors-on-unmatched

[doc("Lint and typecheck")]
[group("bun")]
check: typecheck lint

[doc("Run automated tests")]
[group("bun")]
test:
    {{ bun }} test --bail=1

[doc("Run automated tests (with filtering)")]
[group("bun")]
testf filter:
    {{ bun }} test --bail=1 --test-name-patttern="{{ filter }}"
