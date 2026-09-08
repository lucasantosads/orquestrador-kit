/**
 * Peça 0e(c) — o prompt do agente ganha o bloco "COMO RODAR COMANDOS".
 *
 * Três regras: o cwd já é a raiz da worktree e nunca se prefixa com `cd`; um
 * comando por chamada, sem `&&` nem `|` encadeando ferramentas diferentes; e os
 * comandos autorizados são exatamente estes — seguidos da lista.
 *
 * REQUISITO, não sugestão: a lista é gerada da MESMA string que vai em
 * `--allowedTools`. Lista fixa no prompt recriaria, em texto, o desalinhamento
 * que a peça 0c matou no código.
 *
 * Evidência: o 230 perdeu 6 turnos e o 234 perdeu 4 em `permission_denials` por
 * `cd &&` e por pipes. É a repetição do incidente do 227 por outra porta: lá a
 * permissão não cobria o comando; aqui o agente monta um comando que permissão
 * nenhuma poderia cobrir.
 *
 * O caso central roda `run_attempt` DE VERDADE, com `claude_run` interceptado
 * para capturar o argv: o `prompt.txt` e o `--allowedTools` comparados são os da
 * MESMA chamada, não duas derivações que o teste juntou.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

const TICKET = {
  id: '901',
  slug: 'da-vez',
  objetivo: 'monta o card e prova que ele aparece',
  pathspec_allowlist: ['src/a.ts'],
  criterios_aceite: [
    { tipo: 'alvo', descricao: 'o arquivo existe', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' },
    { tipo: 'alvo', descricao: 'o placar', cmd: 'npm test  # só o placar importa', espera: 'passed' },
    {
      tipo: 'alvo',
      descricao: 'o warn degradado',
      cmd: "test $(grep -cE 'export const WARN_(TRENDS|PERGUNTAS)_DEGRADADO' src/a.ts) -eq 2",
      espera: '',
    },
    { tipo: 'avaliador', descricao: 'o card é MONTADO na page', cmd: 'true', espera: 'avaliador' },
  ],
};

/** Fixture git mínimo: o `run_attempt` mede diff, então precisa de repo real. */
function fixtureGit() {
  const fx = criarFixture([]);
  escreverTicket(fx, TICKET);
  const wt = join(fx, 'wt');
  mkdirSync(join(wt, 'src'), { recursive: true });
  writeFileSync(join(wt, 'src', 'base.ts'), 'export const base = 1\n');
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  spawnSync('git', ['-C', wt, 'init', '-q', '-b', 'main'], { encoding: 'utf8' });
  g('add', '-A');
  g('commit', '-qm', 'base');
  return { fx, wt };
}

/**
 * Roda run_attempt com claude_run INTERCEPTADO. Devolve o prompt gerado e o
 * argv exato da chamada — os dois da mesma execução.
 */
function tentativaReal(): { prompt: string; argv: string[]; tools: string } {
  const { fx, wt } = fixtureGit();
  const rundir = join(fx, 'docs', 'fila', 'runs', '901', 'attempt-0');
  const argvFile = join(fx, 'argv.txt');
  const script = [
    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}"`,
    'set +e',
    // Intercepta a chamada paga: grava o argv e devolve um envelope vazio.
    `claude_run() { local d="$1" o="$2" s="$3"; shift 3; [ "\${1:-}" = "--" ] && shift; printf '%s\\n' "$@" > "${argvFile}"; printf '{}\\n' > "$o"; return 0; }`,
    // Enforcement e gates não são o assunto deste teste e custam segundos.
    `enforcement_stub() { :; }`,
    `run_attempt "$(ticket_file_by_id 901)" "${wt}" "${rundir}" sonnet "" 0`,
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx, env: { ...process.env } });
  const prompt = ler(join(rundir, 'prompt.txt'));
  expect(prompt, `run_attempt não gerou prompt: ${r.stderr}`).not.toBe('');
  const argv = ler(argvFile).replace(/\n$/, '').split('\n');
  const i = argv.indexOf('--allowedTools');
  expect(i, `--allowedTools ausente no argv: ${argv.join(' | ')}`).toBeGreaterThan(-1);
  return { prompt, argv, tools: argv[i + 1] ?? '' };
}

/** A lista do bloco, item a item, na ordem em que o prompt a apresenta. */
function listaDoPrompt(prompt: string): string[] {
  const bloco = prompt.split('COMO RODAR COMANDOS')[1] ?? '';
  const ate = bloco.split('Qualquer outra coisa é NEGADA')[0] ?? '';
  return ate
    .split('\n')
    .filter((l) => l.startsWith('  - '))
    .map((l) => l.slice(4));
}

describe('o bloco existe e diz as três regras', () => {
  const { prompt } = tentativaReal();

  it('o prompt tem o bloco', () => {
    expect(prompt).toContain('COMO RODAR COMANDOS');
  });

  it('regra 1: o cwd já é a raiz da worktree, nunca prefixar com cd', () => {
    expect(prompt).toMatch(/cwd .*JÁ É a raiz da worktree/);
    expect(prompt).toMatch(/NUNCA prefixe\s+comando com 'cd'/);
  });

  it('regra 2: um comando por chamada, sem && nem | encadeando ferramentas', () => {
    expect(prompt).toContain('UM comando por chamada');
    expect(prompt).toMatch(/Nada de '&&' nem de '\|'/);
  });

  it('regra 3: os autorizados são exatamente estes', () => {
    expect(prompt).toContain('Os comandos autorizados são EXATAMENTE estes');
    expect(prompt).toMatch(/permissão negada não é\s+obstáculo/);
  });
});

describe('a lista é a MESMA string do --allowedTools daquela chamada', () => {
  const { prompt, tools } = tentativaReal();

  it('item a item, na mesma ordem', () => {
    expect(listaDoPrompt(prompt)).toEqual(tools.split(','));
  });

  it('a lista não é fixa: carrega o que ESTE ticket manda rodar', () => {
    const lista = listaDoPrompt(prompt);
    expect(lista).toContain('Bash(test -f src/a.ts && echo ok)');
    expect(lista).toContain('Bash(npm test)');
    // 0e(b) em ação: o prefixo com `|` dentro de aspas chega inteiro.
    expect(lista).toContain(
      "Bash(test $(grep -cE 'export const WARN_(TRENDS|PERGUNTAS)_DEGRADADO' src/a.ts) -eq 2)",
    );
  });

  it('o `cmd` do critério de avaliador TAMBÉM entra — e isso é o desenho da 0c', () => {
    // `toolsDoTicket` recebe os cmd de TODOS os criterios_aceite, inclusive os
    // de tipo avaliador (que o harness nunca executa: `run_criterios` os pula).
    // Fica registrado como fato, não como acidente: a permissão a mais é
    // `Bash(true)`, que não autoriza nada que já não fosse inócuo, e filtrar por
    // tipo aqui separaria a lista do prompt da string do --allowedTools — que é
    // exatamente o que esta peça existe para impedir.
    expect(listaDoPrompt(prompt)).toContain('Bash(true)');
  });

  it('as BASE_TOOLS continuam lá', () => {
    const lista = listaDoPrompt(prompt);
    for (const t of ['Read', 'Edit', 'Write', 'Bash(git add:*)']) expect(lista).toContain(t);
  });
});

describe('uma derivação só, no código', () => {
  const src = readFileSync(EXECUTOR, 'utf8');

  it('run_attempt deriva `tools` uma vez e passa a MESMA variável para as duas bocas', () => {
    expect(src).toContain('tools="$(tools_do_ticket "$file")"');
    expect(src).toContain('build_prompt "$file" "$motivo_anterior" "$tools" > "$prompt"');
    expect(src).toContain('--allowedTools "$tools"');
    // A derivação antiga, inline no ramo do claude, não pode ter sobrado:
    // duas derivações são duas listas esperando divergir.
    expect(src).not.toContain('tools="$(decisao tools "$cmds")"');
  });

  it('build_prompt sem o argumento DERIVA — não existe prompt sem lista', () => {
    expect(src).toContain('[ -n "$tools" ] || tools="$(tools_do_ticket "$file")"');
  });
});
