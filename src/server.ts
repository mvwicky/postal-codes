import * as oak from "oak";

const router = new oak.Router();

const app = new oak.Application();
app.use(router.routes());
app.use(router.allowedMethods());
await app.listen({ port: 80000 });
