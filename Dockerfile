FROM denoland/deno:1.33.1
EXPOSE 8000
WORKDIR /app

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

COPY deps.ts deno.json deno.lock import_map.json /app
RUN ["deno", "cache", "deps.ts"]

COPY . .
CMD ["run", "-A", "main.ts"]
