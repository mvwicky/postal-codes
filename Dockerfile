FROM denoland/deno:2.0.0
EXPOSE 8000
WORKDIR /app

COPY deno.jsonc deno.lock /app
RUN ["deno", "install", "--lock"]

COPY main.ts deps.ts /app
COPY src /app/src
CMD ["run", "-A", "main.ts"]
