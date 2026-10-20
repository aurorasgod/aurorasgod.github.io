import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitFrame } from '../src/lib/orbit-layout.mjs';

test('Orbit remains clear of text and viewport edges throughout a complete cycle', () => {
  for (const width of [305, 375, 700, 768, 1440, 1920]) {
    const layout = { width, top: 120, bottom: width <= 700 ? 340 : 450, centerX: width / 2, centerY: width <= 700 ? 250 : 330, avatarRadius: width <= 700 ? 56 : 72, compact: width <= 700 };
    for (let time = 0; time < 90; time += .25) {
      for (const pointer of [{ x: width / 2, y: 230, active: 0 }, { x: 0, y: 150, active: 1 }, { x: width, y: 400, active: 1 }]) {
        const cards = orbitFrame(layout, time, pointer);
        assert.equal(cards.length, layout.compact ? 6 : 8);
        cards.forEach(card => {
          assert.ok(card.x - card.halfWidth >= 0 && card.x + card.halfWidth <= width);
          assert.ok(card.y - card.halfHeight >= layout.top && card.y + card.halfHeight <= layout.bottom);
          const dx = Math.max(0, Math.abs(card.x - layout.centerX) - card.halfWidth);
          const dy = Math.max(0, Math.abs(card.y - layout.centerY) - card.halfHeight);
          assert.ok(Math.hypot(dx, dy) >= layout.avatarRadius * .42, 'Card crossed the central facial features');
          const radiusSquared = (card.x - layout.centerX) ** 2 + (card.y - layout.centerY) ** 2 + card.z ** 2;
          assert.ok(Math.abs(radiusSquared - card.radius ** 2) < .0001, 'Path is not a circle in 3D');
          assert.ok(Number.isFinite(card.rotationY));
        });
      }
    }
  }
});

test('Foreground cards have presence and can overlap the portrait edge', () => {
  for (const width of [320, 390, 1440]) {
    const compact = width <= 700;
    const layout = { width, top: compact ? 121 : 146, bottom: compact ? 345 : 445, centerX: width / 2, centerY: compact ? 230 : 295, avatarRadius: compact ? 56 : 72, compact };
    let overlap = false;
    let largest = 0;
    for (let time = 0; time < 21; time += .1) {
      for (const card of orbitFrame(layout, time)) {
        largest = Math.max(largest, card.size);
        const dx = Math.max(0, Math.abs(card.x - layout.centerX) - card.halfWidth);
        const dy = Math.max(0, Math.abs(card.y - layout.centerY) - card.halfHeight);
        if (card.z > 0 && Math.hypot(dx, dy) < layout.avatarRadius - 10) overlap = true;
      }
    }
    assert.ok(largest >= (compact ? 43 : 60), 'Cards shrank into tiny ornaments');
    assert.ok(overlap, 'Foreground never reaches the portrait edge');
  }
});

test('Orbit is continuous, expands over time, and reacts to the pointer', () => {
  const layout = { width: 1440, top: 150, bottom: 450, centerX: 720, centerY: 340, avatarRadius: 72, compact: false };
  const first = orbitFrame(layout, 0);
  assert.deepEqual(first, orbitFrame(layout, 0));
  const next = orbitFrame(layout, 1 / 60);
  first.forEach((card, index) => assert.ok(Math.hypot(card.x - next[index].x, card.y - next[index].y) < 3));
  const later = orbitFrame(layout, 5);
  assert.notDeepEqual(first.map(card => card.x), later.map(card => card.x));
  const hovered = orbitFrame(layout, 0, { x: first[0].x - 15, y: first[0].y, active: 1 });
  assert.ok(Math.hypot(hovered[0].x - first[0].x, hovered[0].y - first[0].y) > 3);
});

test('Cards complete a near and far circulation instead of oscillating in place', () => {
  const layout = { width: 1440, top: 150, bottom: 450, centerX: 720, centerY: 340, avatarRadius: 72, compact: false };
  const period = 2 * Math.PI / .32;
  const samples = Array.from({ length: 81 }, (_, index) => orbitFrame(layout, index / 80 * period)[0]);
  assert.ok(Math.min(...samples.map(card => card.x)) < layout.centerX - 200);
  assert.ok(Math.max(...samples.map(card => card.x)) > layout.centerX + 200);
  assert.ok(Math.min(...samples.map(card => card.z)) < -150);
  assert.ok(Math.max(...samples.map(card => card.z)) > 150);
  assert.ok(Math.hypot(samples[20].x - samples[0].x, samples[20].y - samples[0].y) > 150);
  assert.ok(Math.min(...samples.map(card => card.y - card.halfHeight)) < layout.centerY - layout.avatarRadius, 'Far pass does not extend above the portrait');
  assert.ok(Math.max(...samples.map(card => card.y + card.halfHeight)) > layout.centerY + layout.avatarRadius, 'Near pass does not extend below the portrait');
  samples.forEach(card => assert.equal(Math.sign(card.y - layout.centerY), Math.sign(card.z)));
  const near = samples.reduce((a, b) => a.z > b.z ? a : b);
  const far = samples.reduce((a, b) => a.z < b.z ? a : b);
  assert.ok(near.size > far.size * 1.4, 'Near and far scale cues are missing');
  const pointer = { x: layout.centerX + 290, y: layout.centerY, active: 1 };
  let previous = orbitFrame(layout, 0, pointer);
  for (let time = 1 / 60; time <= period + 1; time += 1 / 60) {
    const current = orbitFrame(layout, time, pointer);
    current.forEach((card, index) => assert.ok(Math.hypot(card.x - previous[index].x, card.y - previous[index].y) < 3, 'Orbit jumped at a turn'));
    previous = current;
  }
});
