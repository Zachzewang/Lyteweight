import { IIntegrationsEnv, IntegrationsServer_handle } from "../../cloudflare/integrationsServer";

// Cloudflare Pages routes every /integrations/* request here.
export const onRequest = (context: { request: Request; env: IIntegrationsEnv }): Promise<Response> =>
  IntegrationsServer_handle(context.request, context.env, (input, init) => fetch(input, init));
