import fastify from "fastify";
import cors from "@fastify/cors";
import { serialize } from "./serializer";
import { getTextWithDiffs } from "./index";
import { GetDiffPayload } from "./types";

const server = fastify({ logger: true });

server.post("/", ({ body }, _reply) => {
  const { a, b } = JSON.parse(body as string) as GetDiffPayload;
  server.log.info({
    message: "About to process",
    a,
    b,
  });

  console.time('diff')
  const { changes } = getTextWithDiffs(a, b);
  const serializedResult = serialize(a, b, changes);
  console.timeEnd('diff')

  return serializedResult
});

async function start() {
  await server.register(cors);

  try {
    await server.listen({ port: 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
start();
