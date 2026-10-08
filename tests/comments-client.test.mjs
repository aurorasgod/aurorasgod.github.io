import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as config from '../src/lib/comments.ts';

function client() {
  const node = () => ({ hidden: false, dataset: {}, style: {}, textContent: '',
    listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute() {}, replaceChildren() {}, append() {} });
  const mount = node(), status = node(), text = node(), retry = node(), count = node(), link = node();
  const section = node(), root = node();
  section.dataset = { term: '/blog/post-c9749194/', themeBase: '/comments/', themeVersion: 'test' };
  root.dataset.theme = 'light';
  const elements = { '[data-comments-mount]': mount, '[data-comments-status]': status,
    '[data-comments-status-text]': text, '[data-comments-retry]': retry,
    '[data-comments-count]': count, '[data-discussion-link]': link };
  section.querySelector = selector => elements[selector];
  let frame = null, timer, scripts = 0;
  mount.querySelector = () => frame;
  mount.append = () => scripts++;
  const messages = [], observers = [], events = {};
  const context = { URL, console, parseFloat,
    require: () => config,
    document: { querySelector: () => section, documentElement: root, createElement: node },
    window: { addEventListener(type, fn) { events[type] = fn; } },
    location: { origin: 'https://aurorasgod.github.io' },
    setTimeout(fn) { timer = fn; return 1; }, clearTimeout() {},
    MutationObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe(target) { this.target = target; } },
  };
  const source = readFileSync(new URL('../src/scripts/comments.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { ...context, exports: {} });
  function attachFrame() {
    const classes = new Set(['giscus-frame--loading']);
    frame = { ...node(), contentWindow: { postMessage(data, origin) { messages.push({ data, origin }); } },
      classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
      src: 'https://giscus.app/widget' };
    observers.find(observer => observer.target === mount).fn();
    return frame;
  }
  return { mount, section, root, status, retry, count, link, messages, events, attachFrame,
    slow: () => timer(), scripts: () => scripts,
    changeTheme: mode => { root.dataset.theme = mode; observers.find(observer => observer.target === root).fn(); },
  };
}

test('a comment iframe that loads after the timeout still becomes visible and ready', () => {
  const ui = client(), frame = ui.attachFrame();
  ui.slow();
  assert.equal(ui.section.dataset.state, 'slow');
  assert.equal(ui.mount.hidden, false);
  frame.listeners.load();
  assert.equal(ui.section.dataset.state, 'ready');
  assert.equal(ui.status.hidden, true);
  assert.equal(ui.mount.hidden, false);
  ui.retry.listeners.click();
  assert.equal(ui.scripts(), 1, 'retry should reuse the iframe instead of accumulating giscus listeners');
});

test('theme updates preserve the iframe; foreign messages cannot change discussion links', () => {
  const ui = client(), frame = ui.attachFrame();
  frame.listeners.load();
  ui.changeTheme('dark');
  assert.equal(ui.messages.at(-1).data.giscus.setConfig.theme, 'https://aurorasgod.github.io/comments/dark.css?v=test');
  assert.equal(ui.messages.at(-1).origin, 'https://giscus.app');
  const metadata = { discussion: { url: `https://github.com/${config.comments.repo}/discussions/3`, totalCommentCount: 1, totalReplyCount: 2 } };
  for (const event of [
    { origin: 'https://untrusted.example', source: frame.contentWindow },
    { origin: 'https://giscus.app', source: {} },
  ]) ui.events.message({ ...event, data: { giscus: metadata } });
  assert.equal(ui.link.href, undefined);
  ui.events.message({ origin: 'https://giscus.app', source: frame.contentWindow, data: { giscus: metadata } });
  assert.equal(ui.link.href, metadata.discussion.url);
  assert.equal(ui.count.textContent, '3');
});
