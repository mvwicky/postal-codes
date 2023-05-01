FROM denoland/deno:1.33.1
EXPOSE 8000
WORKDIR /app

ADD deps.ts deno.json deno.lock /app

RUN deno cache deps.ts

COPY src /app/src
COPY serve.ts /app

CMD ["run", "-A", "main.ts"]
