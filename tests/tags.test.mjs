import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTags, matchesSearch, tagKey } from '../src/lib/tags.ts';

test('Labels remove hashes and deduplicate without losing Chinese or display casing', () => {
  assert.deepEqual(cleanTags(['#VLA', ' vla ', '＃机器人学习', '', '##机器人学习']), ['VLA', '机器人学习']);
  assert.equal(tagKey('＃ＶＬＡ'), 'vla');
});

test('Hashtag search uses exact tags rather than words in a title or body', () => {
  assert.equal(matchesSearch('A VLA title', ['电力电子'], '#VLA'), false);
  assert.equal(matchesSearch('视觉控制记录', ['VLA', '机器人学习'], '#vla'), true);
  assert.equal(matchesSearch('视觉控制记录', ['VLA-baseline'], '#VLA'), false);
  assert.equal(matchesSearch('视觉控制记录', ['VLA', '机器人学习'], '控制 #VLA #机器人学习'), true);
  assert.equal(matchesSearch('A VLA title', ['电力电子'], 'VLA'), true);
  assert.equal(matchesSearch('视觉控制记录', ['VLA'], '＃ＶＬＡ'), true);
});
