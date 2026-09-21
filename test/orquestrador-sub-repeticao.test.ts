/**
 * Peça 7b-4 · sub-motivo, escalada só com sub=juiz, corte de repetição.
 *
 * O caso real que fixa a repetição é o 461 do Actus: diff 717 em três
 * tentativas seguidas, duas delas em opus, o mesmo critério vermelho. As
 * quatro linhas da trilha real estão em test/fixtures/trilha/actus-461-reprovado.log
 * (PROCEDENCIA.md ao lado); são do formato de antes da 7b-4, sem `sub=`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decidirDesfecho, decidirRetry, ehRepeticao, reabertoDeBloqueado, subDaLinha, subDoSinal, type DecisaoConfig, type SinalTentativa } from '../scripts/orquestrador/decisao.js';

const CONFIG = {
  executor_model: 'sonnet', avaliador_model: 'opus', retry_final_model: 'opus', max_retries: 2, diff_cap_linhas: 600,
  worktrees_prefixo: 'fx-',
  restricao_execucao: { ativa: false, tickets_permitidos: [], acao_ticket_fora_da_allowlist: 'x', recusa_exit_code: 78, recusa_mensagem: 'x' },
  politica_adiamento: { causas_que_adiam: ['rate limit', 'timeout', 'gate interrompido no meio'] },
  politica_retry: { por_causa: { diff_cap: { modelo: 'MANTER', acao: 'x' }, enforcement: { modelo: 'MANTER', acao: 'x' }, criterio_qualidade: { modelo: 'ESCALAR', acao: 'x' } } },
} as DecisaoConfig;
const sinal = (s: Partial<SinalTentativa> = {}): SinalTentativa => ({ exitCode: 0, saida: '', diffLines: 10, ...s });
const TRILHA_461 = readFileSync(join(__dirname, 'fixtures', 'trilha', 'actus-461-reprovado.log'), 'utf8').split('\n').filter(Boolean);

describe('subDoSinal: qual mérito reprovou', () => {
  it('gate > juiz > critério > exit', () => {
    expect(subDoSinal(sinal({ gatesRc: 1, gatePapelFalho: 'typecheck', criteriosFalhos: ['x'] }))).toBe('gate_typecheck');
    expect(subDoSinal(sinal({ juizReprovou: true, criteriosFalhos: ['juiz: x'] }))).toBe('juiz');
    expect(subDoSinal(sinal({ criteriosFalhos: ['o arquivo existe'] }))).toBe('criterio');
    expect(subDoSinal(sinal({ exitCode: 2 }))).toBe('exit');
  });

  it('permissão negada com critério vermelho é mérito (sub=criterio) e NÃO escala', () => {
    const s = sinal({ criteriosFalhos: ['o arquivo existe'], saida: '{"permission_denials":[{"tool_name":"Bash"}]}' });
    const v = decidirDesfecho(CONFIG, s);
    expect(v.desfecho).toBe('reprovado');
    expect(v.sub).toBe('criterio');
    const p = decidirRetry(CONFIG, v, 0, 'sonnet');
    expect(p.modelo).toBe('sonnet');
    expect(p.escalou).toBe(false);
  });

  it('exit != 0 sem critério: sub=exit, mesmo modelo', () => {
    const v = decidirDesfecho(CONFIG, sinal({ exitCode: 2, saida: 'erro qualquer' }));
    expect(v.sub).toBe('exit');
    expect(decidirRetry(CONFIG, v, 0, 'sonnet').escalou).toBe(false);
  });
});

describe('subDaLinha: o sub normalizado, com ou sem `sub=` na linha', () => {
  it('linha nova: lê o sub= dela', () => {
    expect(subDaLinha(['t 9 REPROVADO motivo=criterio_qualidade sub=gate_build attempt=1 diff=3'], 0)).toBe('gate_build');
  });
  it('linha do 461 (sem sub=): derivado do GATE da mesma tentativa, criterios=3/4 -> criterio', () => {
    expect(TRILHA_461[3]).toContain('REPROVADO motivo=criterio_qualidade attempt=1 diff=717');
    expect(subDaLinha(TRILHA_461, 3)).toBe('criterio');
  });
  it('GATE com testes=falha -> gate_testes; JUIZ reprovado -> juiz', () => {
    const a = ['t 9 INICIO attempt=1', 't 9 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=ok', 't 9 REPROVADO motivo=criterio_qualidade attempt=1 diff=5'];
    expect(subDaLinha(a, 2)).toBe('gate_testes');
    const b = ['t 9 INICIO attempt=1', 't 9 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=ok', 't 9 JUIZ veredito=reprovado classe=alto', 't 9 REPROVADO motivo=criterio_qualidade attempt=1 diff=5'];
    expect(subDaLinha(b, 3)).toBe('juiz');
  });
});

describe('ehRepeticao: a 2ª reprovação igual corta', () => {
  it('o 461: mesmo sub (criterio) e mesmo diff (717) repete', () => {
    expect(ehRepeticao(TRILHA_461, 'criterio', 717)).toBe(true);
  });
  it('diff diferente (684) não repete; sub diferente não repete', () => {
    expect(ehRepeticao(TRILHA_461, 'criterio', 684)).toBe(false);
    expect(ehRepeticao(TRILHA_461, 'juiz', 717)).toBe(false);
  });
  it('ADIADO no meio não quebra a série; BLOQUEADO, APROVADO e MERGE quebram', () => {
    expect(ehRepeticao([...TRILHA_461, 't 461 ADIADO motivo=servidor attempt=2 rc=1 dur=3s cooldown=nao'], 'criterio', 717)).toBe(true);
    for (const ev of ['BLOQUEADO motivo=criterio_qualidade attempt=3', 'APROVADO merge=aguardando', 'MERGE alvo=staging-auto sha=abc']) {
      expect(ehRepeticao([...TRILHA_461, `t 461 ${ev}`], 'criterio', 717), ev).toBe(false);
    }
  });
  it('sem reprovação anterior, nada repete', () => {
    expect(ehRepeticao([], 'criterio', 717)).toBe(false);
    expect(ehRepeticao(TRILHA_461.slice(0, 3), 'criterio', 717)).toBe(false);
  });
});

describe('reabertoDeBloqueado: devolução humana (peça 7b-8)', () => {
  const L = (ev: string) => `2026-09-21T10:00:00-0300 235 ${ev}`;
  it('último desfecho BLOQUEADO (e o status agora é pendente, conferido por quem chama): reaberto', () => {
    expect(reabertoDeBloqueado([L('INICIO attempt=3'), L('REPROVADO motivo=criterio_qualidade attempt=3 diff=4'), L('BLOQUEADO motivo=criterio_qualidade attempt=3')])).toBe(true);
    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=adiamentos n=4 limite=4')])).toBe(true);
  });
  it('eventos sem desfecho depois do BLOQUEADO não mudam a resposta', () => {
    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=sem_progresso n=3 limite=3'), L('DECISAO_PENDENTE origem=humano-executor')])).toBe(true);
  });
  it('RECUPERADO depois do BLOQUEADO: já processado, não zera de novo', () => {
    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=criterio_qualidade attempt=3'), L('RECUPERADO motivo=reaberto de=bloqueado')])).toBe(false);
  });
  it('o ticket já voltou a rodar (INICIO, ADIADO) ou nunca bloqueou: não é reabertura', () => {
    expect(reabertoDeBloqueado([L('BLOQUEADO motivo=x'), L('RECUPERADO motivo=reaberto de=bloqueado'), L('INICIO attempt=1')])).toBe(false);
    expect(reabertoDeBloqueado([L('INICIO attempt=1'), L('ADIADO motivo=servidor attempt=1 rc=1 dur=2s cooldown=nao')])).toBe(false);
    expect(reabertoDeBloqueado([])).toBe(false);
  });
});

describe('as cópias EMBUTIDAS nos testes que viajam são as fixtures do kit (peça 7b-9)', () => {
  // Os test-*.sh vão para todo repo instalado, onde test/fixtures/ não existe:
  // por isso carregam as fixtures em heredoc. A cópia no kit segue sendo a
  // referência, e este caso impede as duas de divergirem em silêncio.
  const heredoc = (script: string, marca: string): string => {
    const txt = readFileSync(join(__dirname, '..', 'scripts', 'orquestrador', script), 'utf8');
    const ini = txt.indexOf(`<<'${marca}'\n`);
    expect(ini, `${script} sem o heredoc ${marca}`).toBeGreaterThan(-1);
    const corpo = txt.slice(ini + `<<'${marca}'\n`.length);
    return corpo.slice(0, corpo.indexOf(`\n${marca}\n`) + 1);
  };
  const fixture = (...p: string[]) => readFileSync(join(__dirname, 'fixtures', ...p), 'utf8');

  it('test-reprovado-sub.sh: a trilha do 461', () => {
    expect(heredoc('test-reprovado-sub.sh', 'TRILHA_461')).toBe(fixture('trilha', 'actus-461-reprovado.log'));
  });
  it('test-preflight.sh: os dois envelopes reais', () => {
    expect(heredoc('test-preflight.sh', 'ENVELOPE_429')).toBe(fixture('claude-envelope', 'rate-limit-429.txt'));
    expect(heredoc('test-preflight.sh', 'ENVELOPE_CONEXAO')).toBe(fixture('claude-envelope', 'conexao-recusada.txt'));
  });
});
