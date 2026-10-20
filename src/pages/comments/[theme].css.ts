import type { APIRoute } from 'astro';
import fonts from '../../styles/fonts.css?inline';
import shared from '../../styles/comments-frame.css?inline';
import { palettes } from '../../data/palette';

export function getStaticPaths() {
  return [{ params: { theme: 'light' } }, { params: { theme: 'dark' } }];
}

export const GET: APIRoute = ({ params, site, url }) => {
  const dark = params.theme === 'dark';
  const palette = palettes[dark ? 'dark' : 'light'];
  const colors = { ...palette, editor: palette.surface, fg: palette.text, focus: palette.accent,
    soft: palette['accent-soft'], accentLine: palette['accent-line'], buttonFg: palette.bg,
    buttonBg: palette.accent, buttonHover: palette.accent, buttonLine: palette.accent };
  // The stylesheet runs inside a giscus.app iframe, so font URLs must be absolute.
  const origin = site || url;
  // Vite's development font paths are not available to the remote iframe.
  const fontCss = import.meta.env.DEV ? '' : fonts.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g, (_, _quote, path) => `url("${new URL(path, origin).href}")`);
  const css = `@import url("https://giscus.app/themes/${dark ? 'dark' : 'light'}.css");
${fontCss}
html { color-scheme: ${dark ? 'dark' : 'light'}; --blog-bg:${colors.bg}; }
main {
  --blog-bg:${colors.bg}; --blog-surface:${colors.surface}; --blog-editor:${colors.editor}; --blog-fg:${colors.fg};
  --blog-muted:${colors.muted}; --blog-line:${colors.line}; --blog-focus:${colors.focus}; --blog-accent:${colors.accent};
  --color-fg-default:${colors.fg}; --color-fg-muted:${colors.muted}; --color-fg-subtle:${colors.muted};
  --color-canvas-default:${colors.bg}; --color-canvas-overlay:${colors.surface};
  --color-canvas-inset:${colors.hover}; --color-canvas-subtle:${colors.hover};
  --color-border-default:${colors.line}; --color-border-muted:${colors.line};
  --color-accent-fg:${colors.accent}; --color-accent-emphasis:${colors.accent};
  --color-accent-muted:${colors.accentLine}; --color-accent-subtle:${colors.soft};
  --color-btn-text:${colors.fg}; --color-btn-bg:${colors.surface}; --color-btn-border:${colors.line};
  --color-btn-hover-bg:${colors.hover}; --color-btn-hover-border:${colors.accentLine};
  --color-btn-active-bg:${colors.soft}; --color-btn-selected-bg:${colors.soft};
  --color-btn-primary-text:${colors.buttonFg}; --color-btn-primary-bg:${colors.buttonBg};
  --color-btn-primary-border:${colors.buttonLine}; --color-btn-primary-hover-bg:${colors.buttonHover};
  --color-btn-primary-hover-border:${colors.accent}; --color-btn-primary-selected-bg:${colors.buttonHover};
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
