/**
 * K11a-3 — os casos de `detectarAdiamento` do actus-saas, em `decisao.ts`.
 *
 * ORIGEM (só leitura, 2026-09-08):
 * `~/Projetos/actus-saas/scripts/orquestrador/executor.mjs:189-228`
 * (`SINAIS_AUTENTICACAO` e `detectarAdiamento`) e os casos de
 * `executor.test.mjs:169-201` e `pre-voo.test.mjs:193-217`. As STRINGS de
 * incidente são copiadas de lá literalmente — o texto real que o `claude`
 * imprimiu em 13/08/2026, não uma paráfrase.
 *
 * A FRONTEIRA é a mesma dos dois lados: falha de FERRAMENTA adia e nunca
 * reprova. O que muda é o vocabulário: no Actus a função devolve
 * `{adiar, motivo, cooldown}`; aqui ela devolve uma CAUSA (`sessao`,
 * `rate_limit`, ...), e é o `politica_adiamento.causas_que_adiam` do config que
 * decide se aquela causa adia. Tirar um rótulo de lá desliga o adiamento —
 * autoridade no config, não no código.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectarCausaInfra, decidirDesfecho } from '../scripts/orquestrador/decisao.js';
import type { DecisaoConfig, SinalTentativa } from '../scripts/orquestrador/decisao.js';
import { FX_CHECKOUT, REPO_ROOT } from './fixtures/orq-harness.js';

const CONFIG = JSON.parse(
  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
) as DecisaoConfig;

function sinal(over: Partial<SinalTentativa> = {}): SinalTentativa {
  return { exitCode: 0, saida: '', diffLines: 0, ...over };
}

/**
 * O corpus do Actus, palavra por palavra
 * (`pre-voo.test.mjs:199-206`). O primeiro item é o texto REAL do incidente de
 * 13/08.
 */
const CORPUS_AUTENTICACAO = [
  'Failed to authenticate: OAuth session expired and could not be refreshed',
  'FAILED TO AUTHENTICATE',
  'oauth session expired',
  'API Error: authentication_error',
  'Not authenticated. Please run /login',
  'invalid api key provided',
];

describe('detectarAdiamento do Actus: falha de autenticação ADIA, nunca reprova', () => {
  it("detectarAdiamento: texto real do incidente ('Failed to authenticate' / 'OAuth session expired') adia com cooldown", () => {
    const a = detectarCausaInfra(sinal({ exitCode: 1, saida: 'Failed to authenticate: invalid session' }));
    expect(a).toBe('sessao');
    const b = detectarCausaInfra(sinal({ exitCode: 1, saida: 'OAuth session expired, please run /login' }));
    expect(b).toBe('sessao');
  });

  it('detectarAdiamento: detecção é case-insensitive', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'failed TO AUTHENTICATE' }))).toBe('sessao');
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'oauth SESSION expired' }))).toBe('sessao');
  });

  it('as DUAS pontas reconhecem o mesmo corpus — e ele todo cai em `sessao`', () => {
    for (const texto of CORPUS_AUTENTICACAO) {
      expect(detectarCausaInfra(sinal({ exitCode: 1, saida: `trabalho parcial\n${texto}` })), texto).toBe('sessao');
    }
  });

  it('e `sessao` está em causas_que_adiam do config, então o desfecho é ADIADO sem consumir retry', () => {
    for (const texto of CORPUS_AUTENTICACAO) {
      const v = decidirDesfecho(CONFIG, sinal({ exitCode: 1, saida: texto }));
      expect(v.desfecho, texto).toBe('adiado');
      expect(v.contaComoRetry, texto).toBe(false);
    }
  });
});

describe('detectarAdiamento do Actus: limite e indisponibilidade da API', () => {
  it('detectarAdiamento: timeout e rate limit adiam; limpo não', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 124 }))).toBe('timeout');
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'Error: rate limit exceeded' }))).toBe('rate_limit');
    expect(detectarCausaInfra(sinal({ exitCode: 0, saida: 'done' }))).toBeNull();
  });

  it('`service unavailable` e `503` entram na mesma família (eram do Actus e faltavam)', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'Error: Service Unavailable' }))).toBe('rate_limit');
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'API error (503)' }))).toBe('rate_limit');
  });

  it('503 dentro de um número maior NÃO é indisponibilidade', () => {
    // O Actus casa `"503"` por substring; aqui a borda é de PALAVRA, senão
    // "15039 tokens" na saída de um run bem-sucedido viraria adiamento.
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'gravou 15039 linhas' }))).toBeNull();
  });
});

describe('detectarAdiamento do Actus: exit != 0 com saída vazia', () => {
  it('detectarAdiamento: exit != 0 com stdout vazio adia (mesmo sem padrão de auth explícito)', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: '' }))).toBe('sessao');
    expect(decidirDesfecho(CONFIG, sinal({ exitCode: 1, saida: '' })).desfecho).toBe('adiado');
  });

  it('detectarAdiamento: exit != 0 com stdout NÃO vazio não é tratado como falha de auth', () => {
    const v = decidirDesfecho(CONFIG, sinal({ exitCode: 1, saida: 'algum conteúdo produzido' }));
    expect(v.desfecho).toBe('reprovado');
  });
});

describe('o GATE DUPLO do kit continua valendo (e é uma divergência DELIBERADA)', () => {
  // O Actus adia por PADRÃO mesmo com code 0; o kit exige rc != 0 antes de
  // olhar texto. Um ticket que MENCIONE "rate limit" ou "invalid api key" no
  // código que escreveu sai com rc 0 — e adiar por isso seria a fila parando
  // por causa do próprio trabalho. O incidente real do Actus saiu com code 1
  // (executor.test.mjs:177), então nada se perde no caso que pagou a lição.
  it('rc 0 com texto de rate limit no diff NÃO adia', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 0, saida: 'const MSG = "rate limit exceeded"' }))).toBeNull();
  });

  it('rc 0 com texto de autenticação no código NÃO adia', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 0, saida: 'if (e.type === "authentication_error") ...' }))).toBeNull();
  });
});

describe('o config continua sendo a AUTORIDADE', () => {
  it('tirar "sessão expirada" de causas_que_adiam desliga o adiamento por auth', () => {
    const semSessao: DecisaoConfig = {
      ...CONFIG,
      politica_adiamento: {
        causas_que_adiam: CONFIG.politica_adiamento.causas_que_adiam.filter((c) => !/sess/i.test(c)),
      },
    };
    const v = decidirDesfecho(semSessao, sinal({ exitCode: 1, saida: 'Failed to authenticate' }));
    expect(v.desfecho).toBe('reprovado');
  });

  it('a lista de padrões de autenticação está NO decisao.ts, e é a do Actus', () => {
    // O regex escreve o espaço como `\s+`; a asserção compara com o padrão
    // ESCRITO, não com a frase em prosa — é o código que tem de casar, e um
    // `toContain` da frase passaria só pelo comentário logo acima.
    const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao.ts'), 'utf8');
    for (const p of ['failed\\s+to\\s+authenticate', 'authentication_error', 'not\\s+authenticated', 'invalid\\s+api\\s+key']) {
      expect(fonte, p).toContain(p);
    }
  });
});
