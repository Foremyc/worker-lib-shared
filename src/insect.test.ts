import { describe, expect, it } from 'vitest';
import { insectClassFor } from './insect';

describe('classi Insect V1', () => {
  it.each([[0,'LOW'],[25,'LOW'],[26,'MEDIUM'],[50,'MEDIUM'],[51,'HIGH'],[75,'HIGH'],[76,'CRITICAL'],[100,'CRITICAL']] as const)('classifica %s come %s', (n, c) => expect(insectClassFor(n)).toBe(c));
  it.each([-1,101,NaN,Infinity,25.5])('rifiuta score non interi o fuori dominio: %s', n => expect(() => insectClassFor(n)).toThrow());
});
