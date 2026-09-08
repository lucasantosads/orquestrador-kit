/**
 * A9 — a fronteira adiar/reprovar contra o envelope JSON REAL do `claude -p`.
 *
 * Os testes anteriores da fronteira usavam strings inventadas ('ECONNREFUSED',
 * 'usage limit reached') soltas num arquivo. Desde a peça 5 as duas chamadas
 * pagas do harness passam `--output-format json`, e o que chega ao `is_adiavel`
 * não é mais a mensagem crua: é um envelope de ~1,4 KB com a mensagem enterrada
 * em `.result`, precedido do que o CLI escreveu em stderr — o `claude_run`
 * junta os dois no mesmo arquivo.
 *
 * Os dois arquivos em fixtures/claude-envelope/ foram CAPTURADOS desta máquina
 * (CLI 2.1.259), não escritos à mão:
 *   - rate-limit-429.txt    → ANTHROPIC_BASE_URL apontado para um servidor local
 *                             devolvendo 429 com corpo `rate_limit_error`
 *   - conexao-recusada.txt  → ANTHROPIC_BASE_URL numa porta fechada
 * Os dois saíram com rc=1.
 *
 * O que a captura revelou, e que nenhum teste sintético mostraria: os tokens
 * `rate_limit_error` e `ECONNREFUSED` NÃO aparecem no envelope. O CLI traduz o
 * erro da API para prosa em inglês ('...exceed your organization rate limit',
 * 'Connection refused'). O que segura o adiamento hoje é essa prosa mais o
 * '(429)' — ver o teste 'o que REALMENTE casa'.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FX_CHECKOUT, REPO_ROOT, bashNoFixture, criarFixture, escrever } from './fixtures/orq-harness.js';
import { decidirDesfecho, detectarCausaInfra } from '../scripts/orquestrador/decisao.js';
import type { DecisaoConfig, SinalTentativa } from '../scripts/orquestrador/decisao.js';

const cfg = JSON.parse(
  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
) as DecisaoConfig;

const envelopeReal = (nome: string) =>
  readFileSync(join(import.meta.dirname, 'fixtures', 'claude-envelope', `${nome}.txt`), 'utf8');

const REAL_429 = envelopeReal('rate-limit-429');
const REAL_CONEXAO = envelopeReal('conexao-recusada');

/**
 * Envelope montado a partir do real, trocando só o `.result`. Serve para os
 * casos que a captura não alcança: o corpo cru da API dentro da mensagem, e o
 * texto de sucesso que MENCIONA limite sem ter batido em nenhum.
 */
function comResult(base: string, result: string, is_error: boolean): string {
  const linhas = base.trimEnd().split('\n');
  const env = { ...JSON.parse(linhas[linhas.length - 1]!), result, is_error };
  return [...linhas.slice(0, -1), JSON.stringify(env)].join('\n') + '\n';
}

// ─── Gêmeo bash: is_adiavel sobre o arquivo que o claude_run escreveu ───────

/** Roda o `is_adiavel` REAL do lib.sh contra <saida> e <rc>. */
function isAdiavel(saida: string, rc: number): boolean {
  const raiz = criarFixture([]);
  const arq = join(raiz, 'docs', 'fila', 'runs', 'claude.txt');
  escrever(arq, saida);
  return bashNoFixture(raiz, `is_adiavel "${arq}" ${rc}; echo "VEREDITO=$?"`).stdout.includes(
    'VEREDITO=0',
  );
}

// ─── Gêmeo TypeScript: decidirDesfecho sobre o mesmo par (saída, rc) ────────

const sinal = (saida: string, exitCode: number): SinalTentativa => ({
  exitCode,
  saida,
  diffLines: 10,
});

describe('A9 · envelope de ERRO real ⇒ adia', () => {
  it('429 do CLI: is_adiavel adia', () => {
    expect(isAdiavel(REAL_429, 1)).toBe(true);
  });

  it('429 do CLI: o veredito é adiado por rate_limit, sem consumir retry', () => {
    const v = decidirDesfecho(cfg, sinal(REAL_429, 1));
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('rate_limit');
    expect(v.contaComoRetry).toBe(false);
  });

  it('conexão recusada: is_adiavel adia', () => {
    expect(isAdiavel(REAL_CONEXAO, 1)).toBe(true);
  });

  it('conexão recusada: o veredito é adiado por conexao, sem consumir retry', () => {
    const v = decidirDesfecho(cfg, sinal(REAL_CONEXAO, 1));
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('conexao');
    expect(v.contaComoRetry).toBe(false);
  });

  it('corpo cru da API dentro do .result (rate_limit_error) também adia', () => {
    const bruto = comResult(
      REAL_429,
      'API Error: 429 {"type":"error","error":{"type":"rate_limit_error","message":"Number of request tokens has exceeded your per-minute rate limit"}}',
      true,
    );
    expect(isAdiavel(bruto, 1)).toBe(true);
    expect(decidirDesfecho(cfg, sinal(bruto, 1)).desfecho).toBe('adiado');
  });

  it('ECONNREFUSED literal dentro do .result também adia', () => {
    const bruto = comResult(REAL_CONEXAO, 'API Error: connect ECONNREFUSED 127.0.0.1:443', true);
    expect(isAdiavel(bruto, 1)).toBe(true);
    expect(decidirDesfecho(cfg, sinal(bruto, 1)).causa).toBe('conexao');
  });
});

describe('A9 · o que REALMENTE casa no envelope do CLI 2.1.259', () => {
  // Registro do achado da captura. Se um dia o token aparecer de verdade, este
  // teste cai e a documentação acima passa a estar errada — que é o ponto.
  it('nem `rate_limit_error` nem `ECONNREFUSED` aparecem no envelope real', () => {
    for (const env of [REAL_429, REAL_CONEXAO]) {
      expect(env).not.toContain('rate_limit_error');
      expect(env).not.toContain('ECONNREFUSED');
    }
  });

  it('o que sustenta o adiamento é a PROSA do CLI, não o código de erro estruturado', () => {
    expect(REAL_429).toContain('rate limit');
    expect(REAL_429).toContain('(429)');
    expect(REAL_CONEXAO).toMatch(/connection refused/i);
    // `api_error_status` é o campo estruturado e confiável; hoje ninguém o lê.
    expect(REAL_429).toContain('"api_error_status":429');
  });

  it('envelope de erro traz total_cost_usd: a chamada que falhou também é medida', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
    const arq = join(raiz, 'docs', 'fila', 'runs', 'claude.txt');
    escrever(arq, REAL_429);
    bashNoFixture(raiz, `custo_registrar executor 901 0 "${arq}"`);
    const j = JSON.parse(readFileSync(join(raiz, 'docs', 'fila', 'runs', 'custo.json'), 'utf8'));
    const dia = Object.values(j.dias)[0] as { papel: string; custo_usd: number }[];
    expect(dia).toHaveLength(1);
    expect(dia[0]!.papel).toBe('executor');
    expect(dia[0]!.custo_usd).toBe(0);
  });
});

describe('A9 · envelope de SUCESSO que fala de limite NÃO adia (gate duplo)', () => {
  const SUCESSO = comResult(
    REAL_429,
    'Implementei o rate limit do endpoint: 429 quando estoura a cota por minuto.',
    false,
  );

  it('rc 0 com "rate limit" e "429" no texto: is_adiavel não adia', () => {
    expect(isAdiavel(SUCESSO, 0)).toBe(false);
  });

  it('rc 0: nenhuma causa de infra é detectada', () => {
    expect(detectarCausaInfra(sinal(SUCESSO, 0))).toBeNull();
  });

  it('rc 0 com gates e critérios verdes: aprovado, não adiado', () => {
    expect(decidirDesfecho(cfg, sinal(SUCESSO, 0)).desfecho).toBe('aprovado');
  });
});

describe('A9 · saída VAZIA com rc != 0 ⇒ adia (o CLI não chegou a falar)', () => {
  // Com --output-format json, um CLI que rodou SEMPRE imprime envelope, mesmo
  // em erro — os dois fixtures acima provam isso. Zero byte com rc!=0 é o CLI
  // morrendo antes: login caído, credencial expirada, binário ausente, morte
  // por fora. Sem esta regra o caminho caía em `exit N` => reprovado por
  // criterio_qualidade, queimando retry de um ticket que nunca foi julgado.
  it('is_adiavel adia com arquivo vazio', () => {
    expect(isAdiavel('', 1)).toBe(true);
  });

  it('is_adiavel adia com arquivo INEXISTENTE (o CLI nem abriu a saída)', () => {
    const raiz = criarFixture([]);
    const r = bashNoFixture(raiz, `is_adiavel "${raiz}/nao-existe.txt" 1; echo "VEREDITO=$?"`);
    expect(r.stdout).toContain('VEREDITO=0');
  });

  it('o veredito é adiado (causa sessao) e NÃO consome retry', () => {
    const v = decidirDesfecho(cfg, sinal('', 1));
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('sessao');
    expect(v.contaComoRetry).toBe(false);
  });

  it('só espaço em branco também conta como vazio', () => {
    expect(decidirDesfecho(cfg, sinal('\n  \n', 1)).desfecho).toBe('adiado');
  });

  it('NEGATIVO: saída vazia com rc 0 não adia nada (dry-run escreve arquivo vazio)', () => {
    expect(isAdiavel('', 0)).toBe(false);
    expect(detectarCausaInfra(sinal('', 0))).toBeNull();
  });

  it('NEGATIVO: erro de USO do CLI não é vazio — stderr cai no mesmo arquivo', () => {
    // `claude -p --flag-que-nao-existe` mede 0 byte em stdout, mas o claude_run
    // redireciona 2>&1: o harness vê a mensagem, não o vazio.
    const uso = "error: unknown option '--flag-que-nao-existe'\n";
    expect(isAdiavel(uso, 1)).toBe(false);
    expect(decidirDesfecho(cfg, sinal(uso, 1)).desfecho).toBe('reprovado');
  });

  it('o config continua sendo a autoridade: sem "sessão" em causas_que_adiam, não adia', () => {
    const semSessao: DecisaoConfig = {
      ...cfg,
      politica_adiamento: {
        causas_que_adiam: cfg.politica_adiamento.causas_que_adiam.filter((c) => !/sess/i.test(c)),
      },
    };
    expect(decidirDesfecho(semSessao, sinal('', 1)).desfecho).toBe('reprovado');
  });
});

describe('A9 · os dois gêmeos concordam em todos os casos', () => {
  // is_adiavel (lib.sh, o que roda no preflight) e detectarCausaInfra
  // (decisao.ts, o que decide o desfecho da tentativa) são implementações
  // separadas da MESMA fronteira. Divergência entre elas é como um ticket adia
  // na sondagem e reprova na tentativa — ou o contrário.
  const CASOS: [string, string, number, boolean][] = [
    ['429 real', REAL_429, 1, true],
    ['conexão recusada real', REAL_CONEXAO, 1, true],
    ['sucesso que menciona limite', comResult(REAL_429, 'implementei rate limit (429)', false), 0, false],
    ['vazio com rc!=0', '', 1, true],
    ['vazio com rc 0', '', 0, false],
    ['erro de uso do CLI', "error: unknown option '--x'", 1, false],
  ];

  it.each(CASOS)('%s', (_nome, saida, rc, esperado) => {
    expect(isAdiavel(saida, rc)).toBe(esperado);
    const causa = detectarCausaInfra(sinal(saida, rc));
    expect(causa !== null).toBe(esperado);
  });
});
