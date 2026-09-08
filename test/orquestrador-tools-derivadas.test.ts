/**
 * Peça 0c — a allowlist de tools deixa de ser lista fixa.
 *
 * O caso que originou: no requeue do 227 o agente levou TRÊS negativas de
 * permissão em `npm run typecheck`, gastou 22 turnos e US$ 0,52 contra a parede
 * e saiu sem commitar. A allowlist concedia `Bash(npm run typecheck:root:*)` —
 * derivada só dos gates — e o ticket mandava rodar outros comandos. Permissão
 * que não cobre o que o ticket manda rodar não é rigor, é beco.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BASE_TOOLS,
  padroesDeCmd,
  prefixoDeCmd,
  prefixoSimples,
  toolsDoTicket,
} from '../scripts/orquestrador/perfil.js';
import { FX_CHECKOUT } from './fixtures/orq-harness.js';

const REPO_ROOT = join(__dirname, '..');
const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const CONFIG = JSON.parse(
  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
) as { gates: { nome: string; cmd: string }[]; claude_max_turns: number };
const GATES = CONFIG.gates.map((g) => g.cmd);

describe('prefixo invocável de um cmd de critério', () => {
  it('corta no primeiro espaço duplo', () => {
    expect(prefixoDeCmd('npm test  # só o placar importa')).toBe('npm test');
  });

  it('corta no primeiro pipe', () => {
    expect(prefixoDeCmd("npx vitest run x | grep -c 'passed'")).toBe('npx vitest run x');
  });

  it('cmd simples passa inteiro', () => {
    expect(prefixoDeCmd('npm run typecheck:web')).toBe('npm run typecheck:web');
  });

  it('espaço SIMPLES não corta — argumento faz parte do comando', () => {
    expect(prefixoDeCmd('npm run build:web')).toBe('npm run build:web');
  });
});

describe('só o prefixo simples ganha a forma :*', () => {
  it('comando simples ganha as duas formas', () => {
    expect(padroesDeCmd('npm run typecheck:web')).toEqual([
      'Bash(npm run typecheck:web)',
      'Bash(npm run typecheck:web:*)',
    ]);
  });

  // `:*` casa por PREFIXO. Num prefixo com `&&` isso autorizaria emendar
  // qualquer coisa depois — permissão larga concedida por acidente de sintaxe.
  it('comando composto entra só na forma exata', () => {
    expect(prefixoSimples('test -f x && echo ok')).toBe(false);
    expect(padroesDeCmd('test -f x && echo ok')).toEqual(['Bash(test -f x && echo ok)']);
  });

  it('cmd vazio não vira permissão nenhuma', () => {
    expect(padroesDeCmd('   ')).toEqual([]);
  });
});

describe('comando perigoso nunca vira permissão, venha de onde vier', () => {
  // A allowlist virou DADO derivado do ticket, e ticket entra na fila por
  // gerador. Esta é a segunda tranca: na porta que concede o poder, não só na
  // que aceita o ticket.
  it.each([
    ['rm -rf apps/web/.next'],
    ['sudo npm i'],
    ['git push origin main'],
    ['psql $DATABASE_URL'],
    ['supabase db push'],
    ['curl https://exemplo/x'],
  ])('%s não gera permissão', (cmd) => {
    expect(padroesDeCmd(cmd)).toEqual([]);
  });

  it('um critério com rm não contamina a allowlist do ticket', () => {
    const tools = toolsDoTicket(GATES, ['rm -rf node_modules']).split(',');
    expect(tools.some((t) => t.startsWith('Bash(rm'))).toBe(false);
  });

  it('o que é legítimo continua passando', () => {
    expect(padroesDeCmd('npm run typecheck:web').length).toBe(2);
    expect(padroesDeCmd('git diff --name-only HEAD').length).toBeGreaterThan(0);
  });
});

describe('a allowlist derivada do ticket', () => {
  // O check que o ticket da peça 0c pede, literal.
  it('critério "npm run typecheck:web" gera Bash(npm run typecheck:web)', () => {
    const tools = toolsDoTicket(GATES, ['npm run typecheck:web']);
    expect(tools.split(',')).toContain('Bash(npm run typecheck:web)');
  });

  it('cobre os 4 gates que o prompt manda rodar', () => {
    const tools = toolsDoTicket(GATES, []).split(',');
    for (const c of ['npm run typecheck:root', 'npm run typecheck:web', 'npm test', 'npm run build:web']) {
      expect(tools, `faltou permissão para ${c}`).toContain(`Bash(${c})`);
    }
  });

  it('mantém git add/commit/diff/status por pathspec', () => {
    const tools = toolsDoTicket(GATES, []).split(',');
    for (const g of ['add', 'commit', 'diff', 'status']) {
      expect(tools).toContain(`Bash(git ${g}:*)`);
    }
    expect(BASE_TOOLS).toContain('Bash(git commit:*)');
  });

  // `rm -rf apps/web/.next` é o cmd do gate limpeza_artefatos e NÃO pode virar
  // permissão: o extrator só reconhece npm/npx, e nenhum critério de ticket
  // deveria trazer rm. Se um trouxer, entra na forma exata, nunca com `:*`.
  it('não concede rm por causa do gate de limpeza', () => {
    const tools = toolsDoTicket(GATES, []).split(',');
    expect(tools.some((t) => t.startsWith('Bash(rm'))).toBe(false);
  });

  it('não repete permissão quando gate e critério pedem o mesmo comando', () => {
    const tools = toolsDoTicket(GATES, ['npm run typecheck:web']).split(',');
    const n = tools.filter((t) => t === 'Bash(npm run typecheck:web)').length;
    expect(n).toBe(1);
  });

  it('sem critérios, o resultado é o de antes mais as formas exatas', () => {
    expect(toolsDoTicket(GATES, [])).toBe(toolsDoTicket(GATES));
  });
});

describe('executor.sh usa a allowlist derivada e o teto de turnos', () => {
  const exec = readFileSync(EXECUTOR, 'utf8');

  // A derivação saiu de dentro do ramo do claude e virou `tools_do_ticket` na
  // peça 0e(c), para que a MESMA string alimente o --allowedTools e a lista do
  // bloco "COMO RODAR COMANDOS" do prompt. O que este caso afirma não mudou: os
  // cmd dos critérios chegam ao `decisao tools`. Só o endereço mudou.
  it('passa os cmd dos critérios para o decisao tools', () => {
    expect(exec).toMatch(/cmds="\$\(ticket_json "\$file" \| jq -c '\[\.criterios_aceite\[\]\?\.cmd \/\/ empty\]'\)"/);
    expect(exec).toMatch(/tools_do_ticket\(\) \{[\s\S]*?decisao tools "\$cmds"/);
    expect(exec).toContain('tools="$(tools_do_ticket "$file")"');
  });

  // claude_max_turns existia no config e NINGUÉM passava a flag: teto que não
  // existe é pior que teto ausente, porque parece que existe.
  it('--max-turns sai do config e vai na chamada do agente', () => {
    expect(exec).toMatch(/turns="\$\(cfg '\.claude_max_turns'\)"/);
    expect(exec).toMatch(/--max-turns "\$turns" --allowedTools "\$tools"/);
  });

  it('valor inválido no config não vira flag inválida', () => {
    expect(exec).toMatch(/case "\$turns" in ''\|null\|\*\[!0-9\]\*\) turns=40 ;; esac/);
  });

  it('o config declara claude_max_turns', () => {
    expect(typeof CONFIG.claude_max_turns).toBe('number');
    expect(CONFIG.claude_max_turns).toBeGreaterThan(0);
  });
});

describe('permission_denials deixam de ser ignorados (peça 0c)', () => {
  const exec = readFileSync(EXECUTOR, 'utf8');

  it('o executor lê permission_denials do envelope e loga', () => {
    const fn = /permissoes_negadas\(\) \{[\s\S]*?\n\}/.exec(exec)![0];
    expect(fn).toContain('.permission_denials[]?');
    expect(fn).toMatch(/log "  permissão NEGADA \$n vez\(es\)/);
    expect(fn).toMatch(/event .* PERMISSAO_NEGADA "n=\$n"/);
  });

  it('roda depois do agente e ANTES do diagnóstico do retry', () => {
    const iPerm = exec.indexOf('permissoes_negadas "$saida" "$file"');
    const iDiag = exec.indexOf('diagnostico_retry()');
    expect(iPerm).toBeGreaterThan(0);
    expect(iPerm).toBeLessThan(iDiag);
  });

  it('entram no JSON que vira o motivo do retry', () => {
    expect(exec).toMatch(/--argjson pn "\$\{PERMISSOES_NEGADAS:-\[\]\}"/);
    expect(exec).toContain('{allowlist:$al, criteriosFalhos:$cf, permissoesNegadas:$pn}');
  });
});

describe('morte inesperada do executor deixa rastro (peça 0c, item 3)', () => {
  const exec = readFileSync(EXECUTOR, 'utf8');

  // O buraco medido na peça 0b: o executor do requeue do 227 morreu entre o
  // retorno do agente e o registro de custo sem deixar UMA linha, e a drenagem
  // leu o ticket ainda pendente como "sem progresso".
  it('o trap só é armado quando o executor RODA, não quando é sourced', () => {
    // Peça 12: os três traps (EXIT, TERM, INT) são armados por `armar_traps`,
    // para que o teste exercite exatamente o que a produção arma. O ponto deste
    // caso não mudou: armar acontece na execução, nunca no source.
    expect(exec).toContain('[ "${EXECUTOR_SOURCED:-0}" = 1 ] || { armar_traps; main; }');
    // Armado junto da definição, cada teste vermelho que sourceia o executor
    // gravaria um EXECUTOR_MORREU no fixture — medido em test-preflight.sh.
    expect(exec).not.toMatch(/^trap trap_saida EXIT$/m);
  });

  it('saída != 0 sem desfecho nomeado vira log e evento com o rc', () => {
    // O registro saiu do trap_saida e virou `registrar_morte`, compartilhado com
    // o trap de sinal (peça 12) — a morte é a mesma, o que muda é como se chega
    // nela. O trap_saida continua sendo quem decide se houve morte a registrar.
    const saida = /trap_saida\(\) \{[\s\S]*?\n\}/.exec(exec)![0];
    expect(saida).toContain('[ "$DESFECHO_NOMEADO" = 1 ] && return 0');
    expect(saida).toContain('registrar_morte "$rc"');
    const registro = /registrar_morte\(\) \{[\s\S]*?\n\}/.exec(exec)![0];
    expect(registro).toMatch(/MORTE \$\{sinal:\+POR SINAL \$sinal \}INESPERADA/);
    expect(registro).toContain('EXECUTOR_MORREU "rc=$rc" "fase=${FASE_EM_CURSO:-?}"');
  });

  it('todo caminho de desfecho nomeado marca DESFECHO_NOMEADO', () => {
    // adiado, aprovado, refatiar, bloqueado, recusado e orçamento — seis. O
    // sétimo é o trap de sinal (peça 12), que marca para o trap de EXIT não
    // registrar a mesma morte duas vezes: uma morte, um registro.
    const n = (exec.match(/DESFECHO_NOMEADO=1/g) ?? []).length;
    expect(n).toBe(7);
    expect(/trap_sinal\(\) \{[\s\S]*?\n\}/.exec(exec)![0]).toContain('DESFECHO_NOMEADO=1');
  });

  it('a fase é gravada em variável, não só no snapshot', () => {
    expect(exec).toMatch(/fase\(\) \{ FASE_EM_CURSO="\$1"; status_set "fase=\$1"; \}/);
    expect(exec).toContain('fase agente');
    expect(exec).toContain('fase pos-agente');
  });
});
