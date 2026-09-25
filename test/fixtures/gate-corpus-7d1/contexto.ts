/**
 * O contexto de repositório de um caso do corpus (etapa 7d-1b, peça 4): os
 * fatos de árvore gravados por `gerar-arvores.py` em `arvores.json` e o
 * dicionário de acento de `acentos.json`, na forma que o gate lê
 * (`ContextoRepo`). Em produção o gate pergunta ao git e ao disco; aqui, aos
 * fatos da base de cada caso. Caminho que o gerador não consultou é ausente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContextoRepo } from '../../../scripts/orquestrador/gate-ticket.js';

export interface CasoCorpus {
  grupo: 'a' | 'b';
  repo: 'CI' | 'Actus' | 'Comarka';
  id: string;
  arquivo: string;
  classe?: string;
  causa?: string;
  ticket: Record<string, unknown>;
  fila: Record<string, unknown>[];
}

interface Arvore {
  alvo: Record<string, 'arquivo' | 'diretorio'>;
  disco: string[];
  testes: Record<string, string[]>;
}

const DIR = import.meta.dirname;
const ARVORES = JSON.parse(readFileSync(join(DIR, 'arvores.json'), 'utf8')) as Record<string, Arvore>;
const ACENTOS = JSON.parse(readFileSync(join(DIR, 'acentos.json'), 'utf8')) as Record<string, string[]>;

export function contextoDoCorpus(c: CasoCorpus): ContextoRepo {
  const a = ARVORES[`${c.grupo}:${c.repo}:${c.id}`] ?? { alvo: {}, disco: [], testes: {} };
  const disco = new Set(a.disco);
  const palavras = new Set(ACENTOS[c.repo] ?? []);
  return {
    naAlvo: (p) => a.alvo[p] ?? null,
    noDisco: (p) => disco.has(p),
    testesQueCitam: (texto) => a.testes[texto] ?? [],
    palavrasAcentuadas: () => palavras,
  };
}
