FROM node:18 AS build
WORKDIR /app
ADD . .
RUN npm install

FROM node:18
WORKDIR /app
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/tsconfig.json /app/tsconfig.json
COPY --from=build /app/index.ts /app/index.ts
COPY --from=build /app/node_modules /app/node_modules
ENTRYPOINT ["npm", "start"]
