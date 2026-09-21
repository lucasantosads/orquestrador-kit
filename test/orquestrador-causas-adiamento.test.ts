/**
 * Peça 7b-2 · a tabela de causas do adiamento, na parte PURA (decisao.ts).
 *
 * O que muda, e o porquê de cada linha:
 *   - COOLDOWN só para limite REMOTO (rate_limit, quota). Esperar 60 min só
 *     ajuda quando quem recusou foi a API e a recusa tem prazo.
 *   - 5xx e overloaded deixam de ser `rate_limit`: viram `servidor`, adiam e
 *     NÃO armam cooldown (blip de API; o Comarka travou 3x assim em 03/09).
 *   - crash de runner de gate (`gate_crash`) adia sem cooldown e sem retry:
 *     em QUALQUER papel quando o runner não rodou (rc 126/127, command not
 *     found, ENOENT do binário, Missing script, saída vazia com rc != 0); no
 *     papel testes também quando não há placar nem linha de teste falhando.
 *     Typecheck ou build que rodou e apontou erro de código segue mérito.
 */
import { describe, it, expect } from 'vitest';
import {
  decidirDesfecho,
  detectarCausaInfra,
  gateNaoRodou,
  type DecisaoConfig,
  type SinalTentativa,
} from '../scripts/orquestrador/decisao.js';

const CONFIG = {
  executor_model: 'sonnet',
  avaliador_model: 'opus',
  retry_final_model: 'opus',
  max_retries: 2,
  diff_cap_linhas: 600,
  worktrees_prefixo: 'fx-',
  restricao_execucao: { ativa: false, tickets_permitidos: [], acao_ticket_fora_da_allowlist: 'x', recusa_exit_code: 78, recusa_mensagem: 'x' },
  politica_adiamento: {
    causas_que_adiam: [
      'erro de conexão',
      'sessão expirada',
      'rate limit',
      'quota estourada',
      'timeout de claude_timeout_secs',
      'gate interrompido no meio',
      'veredito do juiz ilegível',
    ],
  },
  politica_retry: {
    por_causa: {
      diff_cap: { modelo: 'MANTER', acao: 'x' },
      enforcement: { modelo: 'MANTER', acao: 'x' },
      criterio_qualidade: { modelo: 'ESCALAR', acao: 'x' },
    },
  },
} as DecisaoConfig;

const sinal = (s: Partial<SinalTentativa> = {}): SinalTentativa => ({ exitCode: 0, saida: '', diffLines: 10, ...s });

/** Um gates.txt como o `gates.ts --run-cli` escreve. */
function gatesTxt(linhaFalha: string, recorte: string, nome = 'test'): string {
  return `ok   typecheck                 812ms\n${linhaFalha}\nVEREDITO: REPROVADO\n\n--- recorte de ${nome} ---\n${recorte}\n`;
}

describe('servidor (5xx/overloaded) sai de rate_limit', () => {
  it('503, Service Unavailable, overloaded e 529 viram servidor', () => {
    for (const saida of ['API Error: 503 Service Unavailable', 'Error: Service Unavailable', 'overloaded_error', 'API Error: 529 Overloaded', 'API Error: 500 Internal Server Error']) {
      expect(detectarCausaInfra(sinal({ exitCode: 1, saida })), saida).toBe('servidor');
    }
  });

  it('429 e rate limit continuam rate_limit', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'API Error: Request rejected (429) · rate_limit_error' }))).toBe('rate_limit');
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'Error: rate limit exceeded' }))).toBe('rate_limit');
  });

  it('503 dentro de número maior segue fora (borda de palavra)', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 1, saida: 'gravou 15039 linhas' }))).toBeNull();
  });
});

describe('cooldown só para limite remoto', () => {
  const casos: Array<[string, Partial<SinalTentativa>, string, boolean]> = [
    ['429', { exitCode: 1, saida: 'Request rejected (429)' }, 'rate_limit', true],
    ['quota', { exitCode: 1, saida: 'usage limit reached' }, 'quota', true],
    ['timeout', { exitCode: 124 }, 'timeout', false],
    ['503', { exitCode: 1, saida: 'API Error: 503 Service Unavailable' }, 'servidor', false],
    ['sessão', { exitCode: 1, saida: 'session expired, please log in again' }, 'sessao', false],
    ['conexão', { exitCode: 1, saida: 'connect ECONNREFUSED 127.0.0.1:443' }, 'conexao', false],
    ['morto por fora', { exitCode: 130 }, 'gate_interrompido', false],
    ['juiz ilegível', { juizIlegivel: true }, 'juiz_ilegivel', false],
  ];
  for (const [nome, s, causa, cooldown] of casos) {
    it(`${nome}: adiado por ${causa}, cooldown=${cooldown}, sem retry`, () => {
      const v = decidirDesfecho(CONFIG, sinal(s));
      expect(v.desfecho).toBe('adiado');
      expect(v.causa).toBe(causa);
      expect(v.cooldown).toBe(cooldown);
      expect(v.contaComoRetry).toBe(false);
    });
  }

  it('reprovado e aprovado não armam cooldown', () => {
    expect(decidirDesfecho(CONFIG, sinal({ criteriosFalhos: ['x'] })).cooldown).toBe(false);
    expect(decidirDesfecho(CONFIG, sinal()).cooldown).toBe(false);
  });
});

describe('gateNaoRodou: o runner não rodou x o código está errado', () => {
  it('testes sem placar e sem linha de teste falhando: crash', () => {
    const g = gatesTxt('FALHA test                     95ms — exit 1', "Error: Cannot find module 'vitest/package.json'");
    expect(gateNaoRodou(g, 'testes')).toBe(true);
  });

  it('testes com placar vermelho: mérito', () => {
    const g = gatesTxt('FALHA test                   4012ms — exit 1', ' FAIL  test/a.test.ts > soma\nAssertionError: expected 2 to be 3\n Tests  1 failed | 3 passed (4)');
    expect(gateNaoRodou(g, 'testes')).toBe(false);
  });

  it('testes com linha FAIL mas sem o resumo (recorte cortado): mérito', () => {
    const g = gatesTxt('FALHA test                   4012ms — exit 1', ' FAIL  test/a.test.ts > soma\n × soma de negativos');
    expect(gateNaoRodou(g, 'testes')).toBe(false);
  });

  it('placar do baseline na linha FALHA: mérito', () => {
    const g = gatesTxt('FALHA testes_por_pacote      7951ms [8 pacotes, 861p/1f] — 1 teste(s) falhando', 'algo', 'testes_por_pacote');
    expect(gateNaoRodou(g, 'testes')).toBe(false);
  });

  it('tsc ausente (rc 127, command not found): crash em typecheck', () => {
    const g = gatesTxt('FALHA typecheck                12ms — exit 127', 'bash: tsc-que-nao-existe: command not found', 'typecheck');
    expect(gateNaoRodou(g, 'typecheck')).toBe(true);
  });

  it('tsc que rodou e apontou erro de código: mérito', () => {
    const g = gatesTxt('FALHA typecheck              2210ms — exit 2', "src/a.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.", 'typecheck');
    expect(gateNaoRodou(g, 'typecheck')).toBe(false);
  });

  it('rc 126 (sem permissão de execução): crash', () => {
    const g = gatesTxt('FALHA build                     8ms — exit 126', 'bash: ./build.sh: Permission denied', 'build');
    expect(gateNaoRodou(g, 'build')).toBe(true);
  });

  it('ENOENT do binário: crash', () => {
    const g = gatesTxt('FALHA build                    40ms — exit 1', 'Error: spawn next ENOENT', 'build');
    expect(gateNaoRodou(g, 'build')).toBe(true);
  });

  it('npm sem o script: crash', () => {
    const g = gatesTxt('FALHA lint                    300ms — exit 1', 'npm error Missing script: "lint"', 'lint');
    expect(gateNaoRodou(g, 'lint')).toBe(true);
  });

  it('saída vazia com rc != 0: crash em qualquer papel', () => {
    const g = gatesTxt('FALHA typecheck                 5ms — exit 1', '', 'typecheck');
    expect(gateNaoRodou(g, 'typecheck')).toBe(true);
  });

  it('build que rodou e falhou compilando: mérito', () => {
    const g = gatesTxt('FALHA build                  9000ms — exit 1', 'Failed to compile.\n./src/a.ts:3:1 Type error: Cannot find name foo', 'build');
    expect(gateNaoRodou(g, 'build')).toBe(false);
  });

  it('teste que rodou, falhou e imprimiu "command not found" no caminho: mérito', () => {
    const g = gatesTxt('FALHA test                   3100ms — exit 1', ' FAIL  test/cli.test.ts > roda o binário\nsh: foo: command not found\n Tests  1 failed | 9 passed (10)');
    expect(gateNaoRodou(g, 'testes')).toBe(false);
  });

  it('gates verdes: nunca crash', () => {
    expect(gateNaoRodou('ok   typecheck  10ms\nok   test  20ms\nVEREDITO: APROVADO\n', 'testes')).toBe(false);
  });
});

describe('gate_crash no desfecho', () => {
  const crash = gatesTxt('FALHA test                     95ms — exit 1', "Error: Cannot find module 'vitest'");

  it('adia sem cooldown e sem retry, mesmo com "gates reprovados" em criteriosFalhos', () => {
    const v = decidirDesfecho(CONFIG, sinal({ gatesRc: 1, gatesSaida: crash, gatePapelFalho: 'testes', criteriosFalhos: ['gates reprovados'] }));
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('gate_crash');
    expect(v.cooldown).toBe(false);
    expect(v.contaComoRetry).toBe(false);
  });

  it('enforcement violado ganha do crash (fronteira é certeza, crash é ambiente)', () => {
    const v = decidirDesfecho(CONFIG, sinal({ gatesRc: 1, gatesSaida: crash, gatePapelFalho: 'testes', enforcementViolado: true }));
    expect(v.desfecho).toBe('refatiar');
  });

  it('tirar "gate interrompido" de causas_que_adiam desliga o gate_crash junto', () => {
    const cfg = { ...CONFIG, politica_adiamento: { causas_que_adiam: ['rate limit'] } } as DecisaoConfig;
    const v = decidirDesfecho(cfg, sinal({ gatesRc: 1, gatesSaida: crash, gatePapelFalho: 'testes', criteriosFalhos: ['gates reprovados'] }));
    expect(v.desfecho).toBe('reprovado');
  });

  it('tirar "rate limit" desliga o servidor junto (os dois vieram do mesmo rótulo)', () => {
    const cfg = { ...CONFIG, politica_adiamento: { causas_que_adiam: ['timeout'] } } as DecisaoConfig;
    expect(decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'API Error: 503 Service Unavailable' })).desfecho).toBe('reprovado');
  });
});

describe('a causa é a medida, não o rótulo (peça 7b-3)', () => {
  it('rc 124 em 9 s com teto de 1500 s não é timeout: é morto por fora, e o motivo traz a medida', () => {
    const v = decidirDesfecho(CONFIG, sinal({ exitCode: 124, duracaoSecs: 9, timeoutSecs: 1500 }));
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('gate_interrompido');
    expect(v.motivo).toContain('rc=124 em 9s');
    expect(v.motivo).not.toMatch(/timeout/);
    expect(v.cooldown).toBe(false);
  });

  it('rc 124 que chegou no teto é timeout, com a medida', () => {
    const v = decidirDesfecho(CONFIG, sinal({ exitCode: 124, duracaoSecs: 1502, timeoutSecs: 1500 }));
    expect(v.causa).toBe('timeout');
    expect(v.motivo).toContain('rc=124 em 1502s');
  });

  it('sem a medida (chamador antigo), rc 124 segue timeout', () => {
    expect(decidirDesfecho(CONFIG, sinal({ exitCode: 124 })).causa).toBe('timeout');
  });
});
