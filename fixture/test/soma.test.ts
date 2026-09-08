import { describe, it, expect } from 'vitest';
import { soma } from '../src/soma.js';

describe('soma', () => {
  it('soma uma lista de positivos', () => {
    expect(soma([1, 2, 3])).toBe(6);
  });

  it('lista vazia soma 0', () => {
    expect(soma([])).toBe(0);
  });

  it('mistura de sinais soma o total, sem filtrar', () => {
    expect(soma([-2, 3, -4])).toBe(-3);
  });
});
