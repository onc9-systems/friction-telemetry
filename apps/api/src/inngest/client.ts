import { Inngest } from "inngest";
import { HonoBindingsMiddleware } from "./bindings";

// Never change the id: a new id is a new app in Inngest Cloud.
export const inngest = new Inngest({ id: "friction-telemetry", middleware: [HonoBindingsMiddleware] });
