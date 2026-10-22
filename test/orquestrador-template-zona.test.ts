/**
 * Etapa 8d-P2 — o template do config só escreve, em `zona_proibida`, chaves que
 * o motor LÊ.
 *
 * O drift que motivou (relatório de paridade do dashboard, seção B, Zona C0):
 * `doutrina/templates/config.json` escrevia `no_write_prefixes`, `readonly_ok` e
 * `excecoes_os_owned`. O motor lê o primeiro como `prefixos_sem_ddl`
 * (config-tabela.ts, o renome da K11a-4) e não tem regra nenhuma para os outros
 * dois. Quem copia o template acredita ter uma fronteira que não existe.
 *
 * "O motor lê" = está em `CHAVES_CONFIG` (config-chaves.ts) como
 * `zona_proibida.<chave>`. E o registro não pode mentir para passar: cada uma
 * dessas chaves tem de existir no tipo que o enforcement recebe.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHAVES_CONFIG } from '../scripts/orquestrador/config-chaves.js';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const TEMPLATE = JSON.parse(readFileSync(join(REPO_ROOT, 'doutrina', 'templates', 'config.json'), 'utf8')) as Record<
  string,
  unknown
>;
const ENFORCEMENT = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'enforcement-core.ts'), 'utf8');

/**
 * Chaves de PROCESSO HUMANO: o motor não as lê, e é o desenho. `descricao` é a
 * prosa da fronteira para quem a revisa; `revisado_humano` é o carimbo de que
 * alguém revisou item a item antes do primeiro run (o CI tem `true`). Decisão
 * do Lucas na 8d: ficam no template como estão. Esta lista é FECHADA — qualquer
 * outra chave desconhecida do motor reprova.
 */
const PROCESSO_HUMANO = ['descricao', 'revisado_humano'];

const LIDAS = CHAVES_CONFIG.filter((c) => c.chave.startsWith('zona_proibida.')).map(
  (c) => c.chave.slice('zona_proibida.'.length).split('.')[0]!,
);

describe('P2 · template sem drift em zona_proibida', () => {
  it('toda chave de zona_proibida do template é lida pelo motor ou é de processo humano', () => {
    const zp = TEMPLATE.zona_proibida as Record<string, unknown>;
    const desconhecidas = Object.keys(zp).filter(
      (k) => !k.startsWith('_') && !PROCESSO_HUMANO.includes(k) && !LIDAS.includes(k),
    );
    expect(desconhecidas, `chaves que o motor não lê: ${desconhecidas.join(', ')}`).toEqual([]);
  });

  it('o registro não inventa chave: cada zona_proibida.<x> lida existe no tipo do enforcement', () => {
    for (const k of new Set(LIDAS)) {
      expect(ENFORCEMENT, `${k} não está em EnforceConfig.zona_proibida`).toMatch(new RegExp(`\\n\\s+${k}\\??:`));
    }
  });

  it('_zona_proibida diz que o motor não tem regra de leitura nem de ownership', () => {
    const nota = String(TEMPLATE._zona_proibida ?? '');
    expect(nota).toMatch(/leitura/i);
    expect(nota).toMatch(/ownership/i);
  });
});
