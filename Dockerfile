FROM denoland/deno:1.32.5

EXPOSE 8000

WORKDIR /app

ADD . /app

RUN deno cache main.ts

CMD ["run", "--allow-read", "--allow-write", "--allow-net", "--allow-env", "--allow-sys", "main.ts"]
