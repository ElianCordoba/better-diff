import fastify from "fastify";
import cors from "@fastify/cors";
import { getDiff, OutputType } from "./index";

// What the frontend sends
interface GetDiffPayload {
  a: string;
  b: string;
}

const server = fastify({ logger: true });

server.post("/", ({ body }, _reply) => {
  const { a, b } = JSON.parse(body as string) as GetDiffPayload;
  // server.log.info({
  //   message: "About to process",
  //   a,
  //   b,
  // });

  console.time("diff took");

  const res = getDiff(a, b, { outputType: OutputType.serializedChunks, alignmentText: ("<<Alignment>>") });
  console.timeEnd("diff took");

  return res;
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
