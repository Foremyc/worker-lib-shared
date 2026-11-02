export type InsectClass = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/** Classi V1 separate dal contratto storico usato dai worker già rilasciati. */
export function insectClassFor(score: number): InsectClass {
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new RangeError('invalid_insect_score');
  return score <= 25 ? 'LOW' : score <= 50 ? 'MEDIUM' : score <= 75 ? 'HIGH' : 'CRITICAL';
}
