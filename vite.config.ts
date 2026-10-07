import { defineConfig } from 'vite';
import { sites } from './build/sites-vite-plugin.ts';
export default defineConfig(async()=>{
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
  process.env.WRANGLER_SEND_METRICS ??= 'false';
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_REGISTRY_PATH ??= '.wrangler/dev-registry';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    publicDir:'.astro-static',
    plugins:[sites({mockAuth:false}),cloudflare({viteEnvironment:{name:'server'},inspectorPort:false,config:{
      name:'laplace-notes',main:'./worker/index.js',compatibility_date:'2026-10-06',compatibility_flags:['nodejs_compat'],
      assets:{binding:'ASSETS',run_worker_first:['/api/*'],not_found_handling:'404-page'},
      d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:'./drizzle'}],
    }})],
  };
});
