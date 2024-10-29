set shell := ["bash", "-uc"]

deps_files := "deps.ts dev_deps.ts"
entry_files := "main.ts cli.ts tests/data_test.ts tests/server_test.ts"
deno := "deno"
podman := "podman"
img_name := "postal-codes"
dockerfile := "Dockerfile"
img_path := "localhost/" + img_name + ":latest"
volume_name := "postal-codes-data"
default_port := "8000"
cov_dir := "./.cov"
lock_file := "./deno.lock"

_default:
	@just --list --justfile {{ justfile() }}

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

[group("deno")]
[doc("Cache deno dependencies")]
cache-deps:
	{{ deno }} install --lock={{ lock_file }}

[group("deno")]
[doc("Cache deno dependencies from scratch")]
reload-deps:
	trash {{ lock_file }}
	{{ deno }} cache --lock={{ lock_file }} --reload {{ deps_files }}

[group("deno")]
[doc("Run typechecking")]
check:
	{{ deno }} check {{ entry_files }}

[group("deno")]
[doc("Lint files")]
lint:
	{{ deno }} lint .

[group("deno")]
[doc("Run automated tests")]
test: && _coverage
	{{ deno }} test --fail-fast=1 --coverage={{ cov_dir }} -A

[group("deno")]
[doc("Run automated tests (with filtering)")]
testf filter: && _coverage
	{{ deno }} test --fail-fast=1 --coverage={{ cov_dir }} --filter={{ filter }} -A

_coverage:
	{{ deno }} coverage {{ cov_dir }} --html

[group("deno")]
[doc("Open generated coverage file")]
open-coverage:
	open {{ cov_dir }}/html/index.html
