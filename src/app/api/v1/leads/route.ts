import { body, json, route } from "@/server/api";
import { createLead } from "@/server/leads";

export const POST = route(async (req) => {
  const lead = await createLead(await body(req));
  return json({ data: { id: lead.id, status: lead.status } }, 201);
});
