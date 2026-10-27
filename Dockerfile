FROM node:22-trixie-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-trixie-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/server.mjs ./
# Para generar el acceso al admin dentro del contenedor: node scripts/admin-secret.ts correo 'clave'
COPY --from=build /app/scripts/admin-secret.ts ./scripts/
COPY --from=build /app/src/totp.ts ./src/
VOLUME /app/data
EXPOSE 4321
CMD ["node", "server.mjs"]
