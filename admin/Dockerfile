FROM oven/bun:1.3

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --cwd admin build

EXPOSE 7000

CMD ["bun", "run", "--cwd", "admin", "preview", "--host", "0.0.0.0", "--port", "7000"]
