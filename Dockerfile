FROM denoland/deno:1.33.1
EXPOSE 8000
WORKDIR /app

COPY deps.ts deno.jsonc deno.lock /app
RUN ["deno", "cache", "deps.ts"]

COPY src /app/src
COPY main.ts /app
CMD ["run", "-A", "main.ts"]
