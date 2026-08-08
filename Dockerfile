# syntax=docker/dockerfile:1

# bookworm-slim و نه alpine. دو ماژول نیتیو داریم — sharp (واترمارک تصاویر
# واژه‌یاب) و @node-rs/argon2 (هش رمز) — و هر دو روی glibc باینریِ از پیش ساخته
# دارند. روی musl یا باید از سورس build شوند یا در زمان اجرا بمیرند. مستندات
# خودِ Next هم برای sharp روی glibc هشدارِ حافظه می‌دهد نه شکست؛ روی musl داستان
# بدتر است. چند ده مگابایت بیشتر، در برابر یک کلاس کاملِ خطای زمانِ اجرا.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1


# ---------------------------------------------------------------- وابستگی‌ها --
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# ci و نه install: دقیقاً همان چیزی نصب می‌شود که در lockfile است، وگرنه build
# روی سرور می‌تواند با build روی لپ‌تاپ فرق کند.
RUN npm ci


# --------------------------------------------------------------------- build --
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


# ------------------------------------------------------- ابزارهای زمان اجرا --
# migrate.mjs و seed-admin.mjs بیرون از اپ اجرا می‌شوند، پس pg و argon2 را از
# node_modules خودشان می‌گیرند نه از اپ.
#
# چرا جدا: خروجی standalone فقط چیزهایی را دارد که ردیابیِ importهای Next به آن
# رسیده. اسکریپت‌هایی که Next اصلاً نمی‌بیندشان، سهمی از آن ندارند. این نصبِ
# کوچک و مستقل یعنی مهاجرت دیتابیس مستقل از اینکه اپ امروز چه چیزی import می‌کند
# کار می‌کند — و دقیقاً وقتی به آن نیاز داریم که اپ هنوز بالا نیامده.
#
# نسخه‌ها پین شده‌اند تا با package.json یکی بمانند.
FROM base AS tools
WORKDIR /tools
RUN npm init -y > /dev/null \
 && npm install --omit=dev --no-audit --no-fund \
      pg@8.22.0 \
      @node-rs/argon2@2.0.2


# --------------------------------------------------------------------- اجرا --
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# server.js خروجیِ standalone عمداً public/ و .next/static را کپی نمی‌کند (فرض
# را بر CDN می‌گذارد). ما CDN نداریم و آن ۳۱ فایل صوتیِ اوزان در public/audio
# باید سرو شوند، پس دستی می‌آیند — بعد از این، خودِ server.js سروشان می‌کند.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts/migrate.mjs /app/scripts/seed-admin.mjs ./scripts/
COPY --from=tools /tools/node_modules ./scripts/node_modules

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/uploads \
 && chown nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
