import { Middleware } from "inngest";
import type { Context } from "hono";

/**
 * Passes the Worker's bindings into every Inngest function as `env`.
 * `inngest/hono` calls the handler with `[honoContext]`, so the first request argument carries `env`.
 * A new instance is created per request, so the instance field is safe.
 */
export class HonoBindingsMiddleware extends Middleware.BaseMiddleware {
  id = "hono-bindings";
  private env!: Env;

  async wrapRequest({ next, requestArgs }: Middleware.WrapRequestArgs) {
    this.env = (requestArgs[0] as Context<{ Bindings: Env }>).env;
    return await next();
  }

  transformFunctionInput(args: Middleware.TransformFunctionInputArgs) {
    return { ...args, ctx: { ...args.ctx, env: this.env } };
  }
}
