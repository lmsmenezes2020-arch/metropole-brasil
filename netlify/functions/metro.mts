import type { Config, Context } from '@netlify/functions';
import { getStore, getDeployStore } from '@netlify/blobs';
import { blobRepository } from '../../server/blob-repository.mjs';
import { createRoomService } from '../../server/rooms.mjs';

export default async (request: Request, context: Context): Promise<Response> => {
  // Production rooms survive new deploys. Previews cannot change production rooms.
  const production = context.deploy.context === 'production';
  const options = { name: 'metropole-brasil-4', consistency: 'strong' as const };
  const store = production ? getStore(options) : getDeployStore(options);
  const handler = createRoomService({ repo: blobRepository(store), storageName: 'netlify-blobs' });
  return handler(request, { ip: context.ip });
};
export const config: Config = { path: ['/api/metro', '/api/metro/info'] };
