import { activityAPI } from './activity.mjs';

// GitHub Pages routes are validated by activityAPI independently of site builds.
export default {
  async fetch(request, env) {
    try {
      return await activityAPI(request, env, new Set());
    } catch (error) {
      console.error('Activity database unavailable', error);
      const headers = { 'Cache-Control': 'no-store', Vary: 'Origin' };
      if (request.headers.get('Origin') === 'https://aurorasgod.github.io') {
        headers['Access-Control-Allow-Origin'] = 'https://aurorasgod.github.io';
      }
      return Response.json({ error: 'stats_unavailable' }, { status: 503, headers });
    }
  },
};
