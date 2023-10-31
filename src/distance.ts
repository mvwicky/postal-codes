export type Point = [number, number];

/** Earth radius (meters) */
const R = 6371009.0;

const rad = (deg: number) => Math.PI * (deg / 180);
const sin2 = (arg: number) => Math.sin(arg) ** 2;
// const cos2 = (arg: number) => Math.cos(arg) ** 2;

// function vDist(point1: Point, point2: Point): number {
//   const [p1, lam1] = [rad(point1[0]), rad(point1[1])];
//   const [p2, lam2] = [rad(point2[0]), rad(point2[1])];
//   const dLam = lam2 - lam1;
//   const [cp1, cp2] = [Math.cos(p1), Math.cos(p2)];
//   const [sp1, sp2] = [Math.sin(p1), Math.sin(p2)];
//   const num2 = cp2 * sin2(dLam) + (cp1 * sp2 - sp1 * cp2 * cos2(dLam));
//   const den = sp1 * sp2 + cp1 * cp2 * Math.cos(dLam);
//   const theta = Math.atan2(Math.sqrt(num2), den);
//   const d = R * theta;
//   return d;
// }

/**
 * Calculate distance between two points using the haversine formula.
 */
export function hDist(point1: Point, point2: Point): number {
  const [p1, lam1] = [rad(point1[0]), rad(point1[1])];
  const [p2, lam2] = [rad(point2[0]), rad(point2[1])];
  const [dPhi, dLam] = [p2 - p1, lam2 - lam1];
  const a = sin2(dPhi / 2) + Math.cos(p1) * Math.cos(p2) * sin2(dLam / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
