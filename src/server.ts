import fastify from "fastify";
import cors from "@fastify/cors";
import { serialize } from "./serializer";
import { getTextWithDiffs } from "./index";

const server = fastify({ logger: true });

server.post("/", async ({ body }, reply) => {
  const { a, b } = JSON.parse(body as any);
  server.log.info({
    message: "About to process",
    a,
    b,
  });

  const { changes } = getTextWithDiffs(a, b);
  return serialize(a, b, changes);
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
