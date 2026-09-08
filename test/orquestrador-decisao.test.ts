/**
 * ORQ-05a — lógica de decisão do executor. Tudo puro: nenhum teste toca
 * worktree, git, claude ou rede. A config vem do 000-config.json REAL.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  avaliaRestricaoExecucao,
  papeisPendentes,
  modeloIndefinido,
  detectarCausaInfra,
  causasDeAdiamentoDoConfig,
  decidirDesfecho,
  decidirRetry,
  registroMeta,
  nomeWorktree,
  prefixoDeWorktree,
} from '../scripts/orquestrador/decisao.js';
import type { DecisaoConfig, SinalTentativa } from '../scripts/orquestrador/decisao.js';

const CONFIG_PATH = join(import.meta.dirname, 'fixtures', 'checkout', 'docs', 'fila', '000-config.json');
const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as DecisaoConfig;

const sinal = (s: Partial<SinalTentativa> = {}): SinalTentativa => ({
  exitCode: 0,
  saida: '',
  diffLines: 10,
  ...s,
});

// ─── 1 · restricao_execucao ────────────────────────────────────────────────

const PAPEIS = ['executor_model', 'avaliador_model', 'retry_final_model'] as const;

/**
 * Config sintético com UM papel em PENDENTE_* e a allowlist do fixture reposta.
 *
 * Existe porque o config REAL já foi desbloqueado: os três papéis são os
 * modelos do `claude -p` (agente de código) e nunca dependeram do provider de
 * geração do PRODUTO — o acoplamento ao TK-104 era erro de especificação.
 * Prender os testes de RECUSA ao estado pendente do arquivo real fazia a
 * proteção sumir junto com o desbloqueio. Ela vale para qualquer papel que
 * volte a ficar pendente, então mora aqui, num fixture, não no config.
 */
const cfgPendente = (papel: (typeof PAPEIS)[number] = 'executor_model'): DecisaoConfig => ({
  ...cfg,
  [papel]: 'PENDENTE_TK104',
  restricao_execucao: { ...cfg.restricao_execucao, ativa: true, tickets_permitidos: ['ticket-fixture'] },
});

describe('restricao_execucao — papel pendente bloqueia, papel definido libera', () => {
  // INVARIANTE, não valor literal: prova que os três papéis estão preenchidos e
  // que nenhum é marcador. Não cita 'sonnet' nem 'opus' — trocar de modelo não
  // deve quebrar teste nenhum; só voltar a deixar um papel pendente deve.
  it('INVARIANTE: os três papéis do config real estão preenchidos, nenhum é PENDENTE_*', () => {
    for (const papel of PAPEIS) {
      const valor = cfg[papel];
      expect(typeof valor).toBe('string');
      expect(valor.trim()).not.toBe('');
      expect(valor.startsWith('PENDENTE_')).toBe(false);
      expect(modeloIndefinido(valor)).toBe(false);
    }
    expect(papeisPendentes(cfg)).toEqual([]);
  });

  it('o marcador é reconhecido pelo PREFIXO, não pelo número do ticket', () => {
    expect(modeloIndefinido('PENDENTE_TK104')).toBe(true);
    expect(modeloIndefinido('PENDENTE_QUALQUER_OUTRO')).toBe(true);
    expect(modeloIndefinido('sonnet')).toBe(false);
  });

  // A proteção que NÃO pode sumir com o desbloqueio: papel pendente ainda recusa.
  it('NEGATIVO: com papel PENDENTE_*, ticket fora da allowlist é RECUSADO com o exit code do config', () => {
    const pend = cfgPendente();
    expect(papeisPendentes(pend)).toEqual(['executor_model']);
    const r = avaliaRestricaoExecucao(pend, '072-qualquer-outro');
    expect(r.permitido).toBe(false);
    expect(r.exitCode).toBe(pend.restricao_execucao.recusa_exit_code); // vem do config
    expect(r.mensagem).toBe(pend.restricao_execucao.recusa_mensagem);
  });

  it('NEGATIVO: qualquer um dos três papéis pendente já basta para recusar', () => {
    for (const papel of PAPEIS) {
      const r = avaliaRestricaoExecucao(cfgPendente(papel), '072-qualquer-outro');
      expect(r.permitido).toBe(false);
      expect(r.motivo).toContain(papel);
    }
  });

  it('POSITIVO: o fixture é permitido mesmo com papel pendente', () => {
    const r = avaliaRestricaoExecucao(cfgPendente(), 'ticket-fixture');
    expect(r.permitido).toBe(true);
    expect(r.exitCode).toBe(0);
  });

  it('com os três papéis definidos, a restrição deixa de valer para qualquer ticket', () => {
    expect(avaliaRestricaoExecucao(cfg, '072-qualquer-outro').permitido).toBe(true);
  });

  it('restrição desativada libera geral, mesmo com papel pendente', () => {
    const off: DecisaoConfig = {
      ...cfgPendente(),
      restricao_execucao: { ...cfg.restricao_execucao, ativa: false, tickets_permitidos: [] },
    };
    expect(avaliaRestricaoExecucao(off, '072-outro').permitido).toBe(true);
  });
});

// ─── 2 · fronteira adiar vs reprovar ───────────────────────────────────────

describe('fronteira — infra ADIA, mérito REPROVA', () => {
  // 7 desde a peça 1 da sessão B: 'veredito do juiz ilegível' entrou em
  // causas_que_adiam para que o config siga sendo a AUTORIDADE — tirar o rótulo
  // de lá desliga o adiamento por juiz ilegível junto com os outros.
  it('as 7 causas do config são reconhecidas', () => {
    expect([...causasDeAdiamentoDoConfig(cfg)].sort()).toEqual(
      ['conexao', 'gate_interrompido', 'juiz_ilegivel', 'quota', 'rate_limit', 'sessao', 'timeout'].sort(),
    );
  });

  it('POSITIVO: erro de conexão => ADIADO, nunca reprovado, e não consome retry', () => {
    const v = decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'Error: connect ECONNREFUSED 127.0.0.1:443' }));
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('conexao');
    expect(v.contaComoRetry).toBe(false);
  });

  it('POSITIVO: sessão expirada => ADIADO', () => {
    const v = decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'Error: session expired, please log in again' }));
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('sessao');
  });

  it('timeout (124), morte por fora (130) e gate interrompido também adiam', () => {
    expect(decidirDesfecho(cfg, sinal({ exitCode: 124 })).causa).toBe('timeout');
    expect(decidirDesfecho(cfg, sinal({ exitCode: 130 })).causa).toBe('gate_interrompido');
    expect(decidirDesfecho(cfg, sinal({ exitCode: 1, gateInterrompido: true })).causa).toBe('gate_interrompido');
  });

  it('rate limit e quota adiam', () => {
    expect(decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'Request rejected (429)' })).desfecho).toBe('adiado');
    expect(decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'usage limit reached' })).desfecho).toBe('adiado');
  });

  it('NEGATIVO do gate duplo: menção a rate limit com exit 0 NÃO adia', () => {
    expect(detectarCausaInfra(sinal({ exitCode: 0, saida: 'implementamos rate limit' }))).toBeNull();
  });

  it('causa retirada do config deixa de adiar (o config é a autoridade)', () => {
    const semConexao = {
      ...cfg,
      politica_adiamento: { causas_que_adiam: cfg.politica_adiamento.causas_que_adiam.filter((c) => !/conex/i.test(c)) },
    };
    const v = decidirDesfecho(semConexao, sinal({ exitCode: 1, saida: 'ECONNREFUSED' }));
    expect(v.desfecho).toBe('reprovado');
  });

  // Peça 2 da sessão B: era `reprovado` + retry; virou `refatiar` sem retry
  // (regra 19). Repetir a tentativa nunca conserta um diff grande demais nem um
  // arquivo fora da allowlist — quem decide é humano (ampliar ou fatiar).
  it('diff acima do cap => REFATIAR (regra 19), com o cap vindo do config', () => {
    const v = decidirDesfecho(cfg, sinal({ diffLines: cfg.diff_cap_linhas + 1 }));
    expect(v.desfecho).toBe('refatiar');
    expect(v.causa).toBe('diff_cap');
    expect(v.motivo).toContain(String(cfg.diff_cap_linhas));
    expect(v.contaComoRetry).toBe(false);
  });

  it('diff exatamente no cap NÃO reprova', () => {
    expect(decidirDesfecho(cfg, sinal({ diffLines: cfg.diff_cap_linhas })).desfecho).toBe('aprovado');
  });

  it('critério de qualidade falho => REPROVADO', () => {
    const v = decidirDesfecho(cfg, sinal({ criteriosFalhos: ['avaliador: rota não montada'] }));
    expect(v.desfecho).toBe('reprovado');
    expect(v.causa).toBe('criterio_qualidade');
  });

  it('infra ganha de cap: rede caindo com diff enorme adia, não reprova', () => {
    const v = decidirDesfecho(cfg, sinal({ exitCode: 1, saida: 'socket hang up', diffLines: 99_999 }));
    expect(v.desfecho).toBe('adiado');
  });

  it('tudo verde => aprovado', () => {
    expect(decidirDesfecho(cfg, sinal()).desfecho).toBe('aprovado');
  });
});

// ─── 3 · política de retry ─────────────────────────────────────────────────

describe('retry — cap e fronteira MANTÊM modelo, qualidade ESCALA', () => {
  const MODELO = 'modelo-barato';

  // O caso 062a nasceu como "diff_cap não ESCALA o modelo". Com a regra 19 ele
  // ficou mais forte: diff_cap não gera retry NENHUM. O contrato de não-escalar
  // continua testado logo abaixo, porque a política do config segue valendo se
  // algum caminho futuro entregar um veredito mecânico a decidirRetry.
  it('NEGATIVO (caso 062a, endurecido): diff_cap não gera retry, quanto mais escalado', () => {
    const v = decidirDesfecho(cfg, sinal({ diffLines: cfg.diff_cap_linhas + 500 }));
    const p = decidirRetry(cfg, v, 0, MODELO);
    expect(p.deveTentar).toBe(false);
    expect(p.modelo).toBe(MODELO);
    expect(p.escalou).toBe(false);
    expect(p.motivo).toMatch(/desfecho refatiar não gera retry/);
  });

  it('o contrato de NÃO-ESCALAR por tamanho segue vivo (veredito mecânico direto)', () => {
    const v = { desfecho: 'reprovado' as const, causa: 'diff_cap' as const, motivo: 'x', contaComoRetry: true };
    const p = decidirRetry(cfg, v, 0, MODELO);
    expect(p.modelo).toBe(MODELO);
    expect(p.escalou).toBe(false);
    expect(p.estreitarEscopo).toBe(true);
    expect(p.acao).toBe(cfg.politica_retry.por_causa.diff_cap?.acao);
  });

  it('POSITIVO: reprovação por qualidade escala para retry_final_model', () => {
    const v = decidirDesfecho(cfg, sinal({ criteriosFalhos: ['avaliador: X'] }));
    const p = decidirRetry(cfg, v, 0, MODELO);
    expect(p.deveTentar).toBe(true);
    expect(p.modelo).toBe(cfg.retry_final_model);
    expect(p.escalou).toBe(true);
    expect(p.estreitarEscopo).toBe(false);
  });

  it('config que mandasse escalar por diff_cap é rejeitada, não obedecida', () => {
    const torto = {
      ...cfg,
      politica_retry: { por_causa: { ...cfg.politica_retry.por_causa, diff_cap: { modelo: 'OUTRO', acao: 'x' } } },
    };
    const v = { desfecho: 'reprovado' as const, causa: 'diff_cap' as const, motivo: 'x', contaComoRetry: true };
    expect(() => decidirRetry(torto, v, 0, MODELO)).toThrow(/proibido/);
  });

  // ORQ-11 · AJUSTE 2 — violação de ENFORCEMENT não escala modelo.
  // Antes, o executor empurrava 'enforcement: violação de zona/escopo' para
  // dentro de criteriosFalhos; virava causa criterio_qualidade e ESCALAVA. Pela
  // política gravada, escalar é remédio de falha de QUALIDADE. Violação de
  // fronteira mantém modelo e estreita escopo, igual diff_cap.

  it('violação de enforcement tem causa PRÓPRIA e vira refatiar, não criterio_qualidade', () => {
    const v = decidirDesfecho(cfg, sinal({ enforcementViolado: true }));
    expect(v.desfecho).toBe('refatiar');
    expect(v.causa).toBe('enforcement');
    expect(v.contaComoRetry).toBe(false);
  });

  it('NEGATIVO: enforcement não gera retry — a fronteira não se conserta repetindo', () => {
    const v = decidirDesfecho(cfg, sinal({ enforcementViolado: true }));
    const p = decidirRetry(cfg, v, 0, MODELO);
    expect(p.deveTentar).toBe(false);
    expect(p.escalou).toBe(false);
  });

  it('o contrato de NÃO-ESCALAR por fronteira segue vivo (veredito mecânico direto)', () => {
    const v = { desfecho: 'reprovado' as const, causa: 'enforcement' as const, motivo: 'x', contaComoRetry: true };
    const p = decidirRetry(cfg, v, 0, MODELO);
    expect(p.modelo).toBe(MODELO);
    expect(p.escalou).toBe(false);
    expect(p.estreitarEscopo).toBe(true);
    expect(p.acao).toBe(cfg.politica_retry.por_causa.enforcement?.acao);
  });

  it('enforcement vence os critérios: fronteira violada não vira falha de qualidade', () => {
    const v = decidirDesfecho(cfg, sinal({ enforcementViolado: true, criteriosFalhos: ['avaliador: X'] }));
    expect(v.causa).toBe('enforcement');
    expect(v.desfecho).toBe('refatiar');
    expect(decidirRetry(cfg, v, 0, MODELO).escalou).toBe(false);
  });

  it('config que mandasse ESCALAR por enforcement é rejeitada, não obedecida', () => {
    const v = { desfecho: 'reprovado' as const, causa: 'enforcement' as const, motivo: 'x', contaComoRetry: true };
    for (const modelo of ['ESCALAR', 'OUTRO']) {
      const torto = {
        ...cfg,
        politica_retry: { por_causa: { ...cfg.politica_retry.por_causa, enforcement: { modelo, acao: 'x' } } },
      };
      expect(() => decidirRetry(torto, v, 0, MODELO)).toThrow(/proibido/);
    }
  });

  it('config com ESCALAR em diff_cap também é rejeitada (a asserção vem ANTES do ramo)', () => {
    const torto = {
      ...cfg,
      politica_retry: { por_causa: { ...cfg.politica_retry.por_causa, diff_cap: { modelo: 'ESCALAR', acao: 'x' } } },
    };
    const v = { desfecho: 'reprovado' as const, causa: 'diff_cap' as const, motivo: 'x', contaComoRetry: true };
    expect(() => decidirRetry(torto, v, 0, MODELO)).toThrow(/proibido/);
  });

  it('max_retries do config encerra em bloquear', () => {
    const v = decidirDesfecho(cfg, sinal({ criteriosFalhos: ['x'] }));
    const p = decidirRetry(cfg, v, cfg.max_retries, MODELO);
    expect(p.deveTentar).toBe(false);
    expect(p.acao).toBe('bloquear');
    expect(p.motivo).toContain(String(cfg.max_retries));
  });

  it('adiado não gera retry', () => {
    const v = decidirDesfecho(cfg, sinal({ exitCode: 124 }));
    expect(decidirRetry(cfg, v, 0, MODELO).deveTentar).toBe(false);
  });

  it('aprovado não gera retry', () => {
    expect(decidirRetry(cfg, decidirDesfecho(cfg, sinal()), 0, MODELO).deveTentar).toBe(false);
  });
});

// ─── 4 · meta.json ─────────────────────────────────────────────────────────

describe('registroMeta', () => {
  it('monta a entrada com os 6 campos exigidos', () => {
    const r = registroMeta({
      attempt: 2,
      modelo: 'sonnet',
      duracaoSecs: 12.7,
      diffLines: 431,
      resultado: 'reprovado',
      ts: '2026-08-17T12:00:00Z',
    });
    expect(r).toEqual({
      attempt: 2,
      model: 'sonnet',
      claude_dur_secs: 13,
      diff_lines: 431,
      resultado: 'reprovado',
      ts: '2026-08-17T12:00:00Z',
    });
  });

  it('não deixa duração nem diff negativos entrarem na telemetria', () => {
    const r = registroMeta({ attempt: 1, modelo: 'm', duracaoSecs: -5, diffLines: -1, resultado: 'x', ts: 't' });
    expect([r.claude_dur_secs, r.diff_lines]).toEqual([0, 0]);
  });
});

// ─── 5 · nomeWorktree ──────────────────────────────────────────────────────

describe('nomeWorktree', () => {
  it('POSITIVO: devolve nome com o prefixo ci- lido do config', () => {
    expect(prefixoDeWorktree(cfg)).toBe('ci-');
    expect(nomeWorktree(prefixoDeWorktree(cfg), '072')).toBe('ci-072');
  });

  it('sanitiza id com caractere de caminho (worktree não pode escapar do dir)', () => {
    expect(nomeWorktree('ci-', '../fora')).toBe('ci-fora');
    expect(nomeWorktree('ci-', '072 slug/x')).toBe('ci-072-slug-x');
  });

  it('NEGATIVO: id vazio e prefixo ausente falham alto, não geram nome colidível', () => {
    expect(() => nomeWorktree('ci-', '   ')).toThrow(/vazio/);
    expect(() => nomeWorktree('', '072')).toThrow(/prefixo/);
    expect(() => prefixoDeWorktree({ ...cfg, worktrees_prefixo: '' })).toThrow(/worktrees_prefixo/);
  });
});
