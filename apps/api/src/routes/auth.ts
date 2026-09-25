// Sign-in: flows 1 (workspace setup) and 2 (employee sign-in). Reserved for better-auth in phase 02.
import { Hono } from "hono";
import { notImplemented } from "../lib/not-implemented";

const auth = new Hono<{ Bindings: Env }>().all("/*", notImplemented(1));

export default auth;
