import { activityAPI } from './activity.mjs';
import routes from '../.astro-static/routes.json';
const allowedPaths = new Set(routes);
export default {
  async fetch(request, env) {
    if(new URL(request.url).pathname.startsWith('/api/')) {
      try{return await activityAPI(request,env,allowedPaths);}catch(error){console.error('Activity database unavailable',error);return Response.json({error:'stats_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
    }
    return env.ASSETS.fetch(request);
  }
};
