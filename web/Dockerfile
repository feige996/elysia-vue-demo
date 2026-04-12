FROM oven/bun:1.3

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run --cwd web build

EXPOSE 5173

CMD ["bun", "run", "--cwd", "web", "preview", "--host", "0.0.0.0", "--port", "5173"]
