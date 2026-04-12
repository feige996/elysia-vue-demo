FROM oven/bun:1.3

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --cwd api build

EXPOSE 3000

CMD ["bun", "run", "--cwd", "api", "start"]
