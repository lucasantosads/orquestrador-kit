/**
 * K8b-7 — datar as liberações migradas pelo git.
 *
 * A K8b-2 levou `liberacoes.json` para v2 e deixou `liberado_em`/`por` como
 * `desconhecido` onde o disco não dizia — porque migração NÃO inventa dado. O
 * que ela não usou é que o dado existe, só que noutro lugar: o `liberacoes.json`
 * é versionado, e o commit que introduziu o token diz QUANDO e QUEM.
 *
 * `git log --format='%cs %an' -S'<token>' -- <arquivo>` responde isso. O
 * commit que interessa é o MAIS VELHO — o que introduziu —, não o mais novo,
 * que é a última vez que alguém mexeu na linha.
 *
 * O caso central roda contra um repo git de VERDADE, com dois commits reais.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DESCONHECIDO } from '../scripts/orquestrador/liberacoes-core.js';
import type { TokenV2 } from '../scripts/orquestrador/liberacoes-core.js';
import { datar, datadorGit, migrarArquivo } from '../scripts/orquestrador/migrar-liberacoes.js';

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
}

/**
 * Um repo com DOIS commits reais, cada um introduzindo um token, com datas e
 * autores diferentes. As datas entram por `GIT_COMMITTER_DATE`: um teste que
 * dependesse de "hoje" mediria o relógio, não o git.
 */
function repoComDoisCommits(): { raiz: string; arquivo: string } {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-datar-'));
  git(raiz, 'init', '-q', '-b', 'main');
  git(raiz, 'config', 'user.email', 'ninguem@example.invalid');
  git(raiz, 'config', 'user.name', 'Fulano de Tal');
  const arquivo = join(raiz, 'liberacoes.json');

  writeFileSync(arquivo, JSON.stringify({ tokens: ['decisao-schema-v2'] }, null, 2) + '\n');
  git(raiz, 'add', 'liberacoes.json');
  execFileSync('git', ['-C', raiz, 'commit', '-q', '-m', 'libera decisao-schema-v2'], {
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: '2026-03-04T10:00:00-0300',
      GIT_COMMITTER_DATE: '2026-03-04T10:00:00-0300',
      GIT_COMMITTER_NAME: 'Fulano de Tal',
      GIT_AUTHOR_NAME: 'Fulano de Tal',
    },
  });

  writeFileSync(arquivo, JSON.stringify({ tokens: ['decisao-schema-v2', 'aprovacao-do-cliente'] }, null, 2) + '\n');
  git(raiz, 'add', 'liberacoes.json');
  execFileSync('git', ['-C', raiz, 'commit', '-q', '-m', 'libera aprovacao-do-cliente'], {
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: '2026-07-19T18:30:00-0300',
      GIT_COMMITTER_DATE: '2026-07-19T18:30:00-0300',
      GIT_COMMITTER_NAME: 'Beltrana Silva',
      GIT_AUTHOR_NAME: 'Beltrana Silva',
    },
  });
  return { raiz, arquivo };
}

describe('datadorGit contra um repo de verdade, com dois commits', () => {
  it('cada token recebe a data e o autor do commit que o INTRODUZIU', () => {
    const { arquivo } = repoComDoisCommits();
    const d = datadorGit(arquivo);
    expect(d('humano:decisao-schema-v2')).toEqual({ em: '2026-03-04', por: 'Fulano de Tal' });
    expect(d('humano:aprovacao-do-cliente')).toEqual({ em: '2026-07-19', por: 'Beltrana Silva' });
  });

  it('token que nunca esteve no arquivo devolve null — nada é inventado', () => {
    const { arquivo } = repoComDoisCommits();
    expect(datadorGit(arquivo)('humano:nunca-existiu')).toBeNull();
  });

  it('o token é procurado SEM o prefixo `humano:` (o Actus grava sem ele)', () => {
    const { arquivo } = repoComDoisCommits();
    // No disco os tokens estão sem prefixo; a migração é que o acrescenta.
    expect(readFileSync(arquivo, 'utf8')).not.toContain('humano:');
    expect(datadorGit(arquivo)('humano:decisao-schema-v2')?.em).toBe('2026-03-04');
  });

  it('a data do MAIS VELHO vence: mexer na linha depois não redata o token', () => {
    const { raiz, arquivo } = repoComDoisCommits();
    // Um terceiro commit que reescreve o arquivo inteiro (reindentação): a
    // string do token some e volta, então o `-S` o vê de novo — e ainda assim
    // a data tem de continuar sendo a da introdução.
    writeFileSync(arquivo, JSON.stringify({ tokens: ['decisao-schema-v2', 'aprovacao-do-cliente'] }) + '\n');
    git(raiz, 'add', 'liberacoes.json');
    execFileSync('git', ['-C', raiz, 'commit', '-q', '-m', 'reindenta'], {
      env: { ...process.env, GIT_COMMITTER_DATE: '2026-09-01T09:00:00-0300', GIT_COMMITTER_NAME: 'Sicrano' },
    });
    expect(datadorGit(arquivo)('humano:decisao-schema-v2')?.em).toBe('2026-03-04');
  });
});

describe('sem história, `desconhecido` FICA', () => {
  it('arquivo fora do git: nenhum token é datado', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'orq-datar-'));
    const arquivo = join(raiz, 'liberacoes.json');
    writeFileSync(arquivo, JSON.stringify({ tokens: ['solto'] }));
    const r = migrarArquivo(arquivo, 'dry-run');
    const v2 = JSON.parse(r.depois);
    expect(v2.tokens[0].liberado_em).toBe(DESCONHECIDO);
    expect(v2.tokens[0].por).toBe(DESCONHECIDO);
  });

  it('git que falha (ou não existe) não derruba a migração', () => {
    const tokens: TokenV2[] = [{ token: 'humano:x', liberado_em: DESCONHECIDO, por: DESCONHECIDO, origem: 'v1:tokens' }];
    const r = datar(tokens, () => {
      throw new Error('spawn ENOENT');
    });
    expect(r.datados).toBe(0);
    expect(tokens[0]!.liberado_em).toBe(DESCONHECIDO);
  });

  it('saída de git ilegível é ignorada em vez de virar data', () => {
    const arquivo = join(mkdtempSync(join(tmpdir(), 'orq-datar-')), 'liberacoes.json');
    writeFileSync(arquivo, '{}');
    const d = datadorGit(arquivo, (_dir, args) =>
      args[0] === 'ls-files' ? { status: 0, stdout: '' } : { status: 0, stdout: 'ontem, o Fulano\n' },
    );
    expect(d('humano:x')).toBeNull();
  });
});

describe('datar NUNCA sobrescreve dado presente', () => {
  it('token que já traz data e autor no disco atravessa intacto', () => {
    const tokens: TokenV2[] = [
      { token: 'humano:a', liberado_em: '2026-01-01', por: 'Quem Escreveu', origem: 'v2' },
      { token: 'humano:b', liberado_em: DESCONHECIDO, por: DESCONHECIDO, origem: 'v1:tokens' },
    ];
    const r = datar(tokens, () => ({ em: '2026-09-09', por: 'Git' }));
    expect(tokens[0]).toEqual({ token: 'humano:a', liberado_em: '2026-01-01', por: 'Quem Escreveu', origem: 'v2' });
    expect(tokens[1]!.liberado_em).toBe('2026-09-09');
    expect(r.datados).toBe(1);
  });

  it('preenche só o buraco: data escrita à mão, autor do git', () => {
    const tokens: TokenV2[] = [
      { token: 'humano:c', liberado_em: '2026-02-02', por: DESCONHECIDO, origem: 'v1:liberadas' },
    ];
    datar(tokens, () => ({ em: '2026-09-09', por: 'Git' }));
    expect(tokens[0]!.liberado_em).toBe('2026-02-02');
    expect(tokens[0]!.por).toBe('Git');
  });
});

describe('a migração inteira, ponta a ponta, no repo de verdade', () => {
  it('o v2 gravado sai datado, e o relatório diz quantos', () => {
    const { raiz, arquivo } = repoComDoisCommits();
    const r = migrarArquivo(arquivo, 'aplicar');
    expect(r.mudou).toBe(true);
    const v2 = JSON.parse(readFileSync(arquivo, 'utf8'));
    expect(v2.tokens).toEqual([
      { token: 'humano:decisao-schema-v2', liberado_em: '2026-03-04', por: 'Fulano de Tal', origem: 'v1:tokens' },
      { token: 'humano:aprovacao-do-cliente', liberado_em: '2026-07-19', por: 'Beltrana Silva', origem: 'v1:tokens' },
    ]);
    expect(r.linhas.join('\n')).toMatch(/2 token\(s\) datado\(s\) pelo git/);
    // O .bak guarda o estado ANTES, como em toda migração do kit.
    expect(JSON.parse(readFileSync(`${arquivo}.bak`, 'utf8')).tokens[0]).toBe('decisao-schema-v2');
    expect(git(raiz, 'status', '--porcelain')).toContain('liberacoes.json');
  });

  it('rodar de novo é no-op: já datado, nada muda', () => {
    const { arquivo } = repoComDoisCommits();
    migrarArquivo(arquivo, 'aplicar');
    const depoisDaPrimeira = readFileSync(arquivo, 'utf8');
    const segunda = migrarArquivo(arquivo, 'aplicar');
    expect(segunda.mudou).toBe(false);
    expect(readFileSync(arquivo, 'utf8')).toBe(depoisDaPrimeira);
  });
});
