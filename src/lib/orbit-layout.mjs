const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// A tilted circle: positive depth passes below the portrait, negative depth above.
export function orbitFrame(layout, time, pointer = { x: 0, y: 0, active: 0 }) {
  const { width, top, bottom, centerX, centerY, compact } = layout;
  const avatarRadius = layout.avatarRadius ?? (compact ? 56 : 72);
  const count = compact ? 6 : 8;
  // Let the foreground skim the portrait edge while keeping its central features clear.
  const faceRadius = avatarRadius * .42;
  const clearance = 4;
  const nearScale = 1.15;
  const farScale = .78;
  const verticalGuard = .9;
  const upperRoom = centerY - top;
  const lowerRoom = bottom - centerY;
  const topSizeLimit = (upperRoom - faceRadius - clearance) / (verticalGuard * (nearScale + farScale));
  const bottomSizeLimit = (lowerRoom - faceRadius - clearance) / (2 * verticalGuard * nearScale);
  const idealSize = compact ? clamp(width * .15, 44, 58) : clamp(width * .06, 64, 88);
  const baseSize = Math.max(8, Math.min(idealSize, topSizeLimit * .94, bottomSizeLimit * .94));
  const breath = .5 + .5 * Math.sin(time * .45);
  const minRadiusY = faceRadius + baseSize * nearScale * verticalGuard + clearance;
  const maxRadiusY = Math.min(upperRoom - baseSize * farScale * verticalGuard, lowerRoom - baseSize * nearScale * verticalGuard);
  const radiusY = minRadiusY + Math.max(0, maxRadiusY - minRadiusY) * (.25 + .55 * breath);
  const maxRadiusX = Math.min(centerX, width - centerX) - baseSize * nearScale * .65 - 12;
  const idealRadius = compact ? width * .32 : Math.min(270, width * .22);
  const radiusX = clamp(idealRadius * (.95 + .07 * breath + .025 * pointer.active), radiusY, maxRadiusX);
  const radiusZ = Math.sqrt(Math.max(0, radiusX * radiusX - radiusY * radiusY));
  return Array.from({ length: count }, (_, index) => {
    const seed = index * 2.39996;
    let angle = index / count * Math.PI * 2 + time * .32 + .18;
    angle += .012 * Math.sin(time * .33 + seed);
    const dx = centerX + Math.cos(angle) * radiusX - pointer.x;
    const dy = centerY + Math.sin(angle) * radiusY - pointer.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const influence = Math.exp(-Math.pow(distance / (compact ? 80 : 180), 2)) * pointer.active;
    const tangent = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / distance;
    angle += tangent * influence * .06;
    const depth = Math.sin(angle);
    const size = baseSize * (farScale + (nearScale - farScale) * (depth + 1) / 2);
    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      z: Math.sin(angle) * radiusZ,
      size,
      radius: radiusX,
      halfWidth: size * .65,
      halfHeight: size * verticalGuard,
      rotationX: -.1 * depth,
      rotationY: .38 * Math.cos(angle) + influence * .1,
      rotationZ: -.1 * Math.cos(angle) + .025 * Math.sin(time * .32 + seed),
    };
  });
}
