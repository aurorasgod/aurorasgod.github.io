import assert from 'node:assert/strict';
import test from 'node:test';
import { commentTerm, discussionMetadata, comments } from '../src/lib/comments.ts';

test('comments follow the publication slug rather than title or deployment domain', () => {
  assert.equal(commentTerm('post-c9749194'), '/blog/post-c9749194/');
  assert.equal(commentTerm('/post-c9749194/'), '/blog/post-c9749194/');
});

test('only valid discussions from this repository become outbound links/counts', () => {
  const discussion = { url: `https://github.com/${comments.repo}/discussions/7`, totalCommentCount: 2, totalReplyCount: 3 };
  assert.deepEqual(discussionMetadata({ discussion }), { url: discussion.url, count: 5 });
  for (const invalid of [
    { ...discussion, url: 'javascript:alert(1)' },
    { ...discussion, url: 'https://github.com/other/repo/discussions/7' },
    { ...discussion, url: `${discussion.url}?redirect=https://other.example` },
    { ...discussion, totalCommentCount: -1 },
    { ...discussion, totalReplyCount: '3' },
    { ...discussion, totalCommentCount: NaN },
  ]) assert.equal(discussionMetadata({ discussion: invalid }), null);
  assert.equal(discussionMetadata(null), null);
});
