FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
# seed.ts is excluded from main tsconfig, compile it separately
RUN npx tsc \
  --module commonjs \
  --target ES2021 \
  --esModuleInterop \
  --experimentalDecorators \
  --emitDecoratorMetadata \
  --skipLibCheck \
  --outDir dist-seed \
  prisma/seed.ts
RUN test -f /app/dist/main.js || (echo "BUILD FAILED: dist/main.js not found" && ls -la /app/dist/ && exit 1)

FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist-seed/seed.js || true && node dist/main.js"]
