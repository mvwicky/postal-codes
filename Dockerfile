FROM denoland/deno:1.36.0
EXPOSE 8000
WORKDIR /app

COPY deps.ts deno.jsonc deno.lock /app
RUN ["deno", "cache", "deps.ts"]

COPY src /app/src
COPY main.ts /app
CMD ["run", "-A", "main.ts"]
