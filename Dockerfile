FROM denoland/deno:1.37.2
EXPOSE 8000
WORKDIR /app

COPY deps.ts deno.jsonc deno.lock /app
RUN ["deno", "cache", "deps.ts"]

COPY main.ts /app
COPY src /app/src
CMD ["run", "-A", "main.ts"]
