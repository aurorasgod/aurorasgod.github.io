import type { APIRoute } from 'astro';
import fonts from '../../styles/fonts.css?inline';
import shared from '../../styles/comments-frame.css?inline';

export function getStaticPaths() {
  return [{ params: { theme: 'light' } }, { params: { theme: 'dark' } }];
}

export const GET: APIRoute = ({ params, site, url }) => {
  const dark = params.theme === 'dark';
  const colors = dark
    ? { bg:'#181818', surface:'#202020', fg:'#ededed', muted:'#aeaeae', line:'#343434', accent:'#a2cfb0', soft:'#24312a', accentLine:'#3b5344', hover:'#272727', buttonFg:'#181818' }
    : { bg:'#ffffff', surface:'#ffffff', fg:'#252525', muted:'#6b6b6b', line:'#e8e8e8', accent:'#267052', soft:'#f1f8f3', accentLine:'#d6e8db', hover:'#f6f6f6', buttonFg:'#ffffff' };
  // The stylesheet runs inside a giscus.app iframe, so font URLs must be absolute.
  const origin = site || url;
  const fontCss = fonts.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g, (_, _quote, path) => `url("${new URL(path, origin).href}")`);
  const css = `@import url("https://giscus.app/themes/${dark ? 'dark' : 'light'}.css");
${fontCss}
html { color-scheme: ${dark ? 'dark' : 'light'}; }
main {
  --blog-bg:${colors.bg}; --blog-surface:${colors.surface}; --blog-fg:${colors.fg};
  --blog-muted:${colors.muted}; --blog-line:${colors.line}; --blog-accent:${colors.accent};
  --color-fg-default:${colors.fg}; --color-fg-muted:${colors.muted}; --color-fg-subtle:${colors.muted};
  --color-canvas-default:${colors.bg}; --color-canvas-overlay:${colors.surface};
  --color-canvas-inset:${colors.hover}; --color-canvas-subtle:${colors.hover};
  --color-border-default:${colors.line}; --color-border-muted:${colors.line};
  --color-accent-fg:${colors.accent}; --color-accent-emphasis:${colors.accent};
  --color-accent-muted:${colors.accentLine}; --color-accent-subtle:${colors.soft};
  --color-btn-text:${colors.fg}; --color-btn-bg:${colors.surface}; --color-btn-border:${colors.line};
  --color-btn-hover-bg:${colors.hover}; --color-btn-hover-border:${colors.accentLine};
  --color-btn-active-bg:${colors.soft}; --color-btn-selected-bg:${colors.soft};
  --color-btn-primary-text:${colors.buttonFg}; --color-btn-primary-bg:${colors.accent};
  --color-btn-primary-border:${colors.accent}; --color-btn-primary-hover-bg:${colors.accent};
  --color-btn-primary-hover-border:${colors.accent}; --color-btn-primary-selected-bg:${colors.accent};
  --color-btn-primary-disabled-bg:${colors.accentLine}; --color-btn-primary-disabled-text:${colors.muted};
  --color-btn-primary-disabled-border:${colors.accentLine}; --color-scale-blue-1:${colors.soft};
  --color-social-reaction-bg-reacted-hover:${colors.soft};
  --color-action-list-item-default-hover-bg:${colors.hover};
  --color-segmented-control-bg:${colors.hover}; --color-segmented-control-button-bg:${colors.surface};
  --color-segmented-control-button-selected-border:${colors.line};
}
${shared}`;
  return new Response(css, { headers: { 'Content-Type': 'text/css; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' } });
};
