FROM oven/bun:1 as base

WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN ["bun", "install", "--frozen-lockfile"]

COPY . .

RUN ["bun", "build", "--target=bun", "--production", "--outdir=dist", "./server/index.ts"]

FROM oven/bun:1-slim
EXPOSE 8000
WORKDIR /usr/src/app

COPY --from=base /usr/src/app/dist ./
COPY --from=base /usr/src/app/public ./public

CMD ["bun", "index.js"]
