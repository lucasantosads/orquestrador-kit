/**
 * Divergência 10 — qual bloco ```json vale, num ticket com mais de um.
 *
 * DECISÃO: **o ticket é o PRIMEIRO bloco ```json do arquivo**; qualquer outro
 * bloco JSON no meio da prosa é prosa.
 *
 * Por que o primeiro, e não o último (que era o que o CONTRATO §2 dizia):
 *   - `gate-ticket.ts:blocoJson` e `fila-read.ts:extractJsonBlock` já liam o
 *     primeiro, e são DOIS dos três leitores. O terceiro (`lib.sh:ticket_json`)
 *     concatenava TODOS, e com dois blocos o resultado nem parseia;
 *   - o ticket abre o arquivo. Um bloco JSON no meio da prosa é exemplo,
 *     payload, saída esperada — coisas que um ticket sobre API descreve o
 *     tempo todo. Dizer "vale o último" transforma todo exemplo colado no fim
 *     numa troca silenciosa da fonte de verdade da máquina.
 *
 * Este teste roda a MESMA fixture pelos TRÊS leitores e cobra a mesma resposta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { blocoJson } from '../scripts/orquestrador/gate-ticket.js';
import { extractJsonBlock } from '../scripts/orquestrador/fila-read.js';
import { acharBloco, migrarTicket } from '../scripts/orquestrador/migrar-tickets.js';
import { REPO_ROOT, bashNoFixture, criarFixture } from './fixtures/orq-harness.js';

/**
 * O ticket-fixture: bloco de máquina primeiro, e um SEGUNDO bloco json no meio
 * da prosa — o formato exato que a divergência 10 descreve.
 */
const TICKET = `# 042 — exportar o relatório

\`\`\`json
{
  "id": "042",
  "slug": "exportar-relatorio",
  "status": "pendente",
  "objetivo": "exportar o relatório em CSV",
  "pathspec_allowlist": ["src/relatorio/**"],
  "dependencias": [],
  "criterios_aceite": [],
  "tentativas_consumidas": 1,
  "recon_esperado": "linhas > 0"
}
\`\`\`

## Contexto

A rota devolve hoje este payload, e é ele que o CSV precisa achatar:

\`\`\`json
{
  "id": "999",
  "status": "done",
  "linhas": [{ "a": 1 }, { "a": 2 }]
}
\`\`\`

Repare que o \`status\` acima é do PAYLOAD, não do ticket.
`;

function escreverTicket(md = TICKET): { raiz: string; arquivo: string } {
  const raiz = criarFixture();
  const arquivo = join(raiz, 'docs', 'fila', '042-exportar-relatorio.md');
  writeFileSync(arquivo, md);
  return { raiz, arquivo };
}

/** `ticket_json <arquivo>` pelo lib.sh de verdade, dentro de um fixture real. */
function ticketJsonDoShell(arquivo: string, raiz: string): { rc: number; saida: string } {
  const r = bashNoFixture(raiz, `ticket_json "${arquivo}"`);
  return { rc: r.rc, saida: r.stdout };
}

describe('os TRÊS leitores dão a MESMA resposta: o primeiro bloco', () => {
  it('lib.sh:ticket_json devolve só o primeiro bloco, e ele PARSEIA', () => {
    const { raiz, arquivo } = escreverTicket();
    const { saida } = ticketJsonDoShell(arquivo, raiz);
    const json = JSON.parse(saida);
    expect(json.id).toBe('042');
    expect(json.status).toBe('pendente');
    // O payload da prosa não vazou para dentro do ticket.
    expect(json.linhas).toBeUndefined();
  });

  it('gate-ticket.ts:blocoJson devolve o mesmo objeto', () => {
    const r = blocoJson(TICKET);
    expect(r.ok).toBe(true);
    expect(r.ok && r.json.id).toBe('042');
    expect(r.ok && r.json.status).toBe('pendente');
  });

  it('fila-read.ts:extractJsonBlock devolve o mesmo objeto', () => {
    const j = extractJsonBlock(TICKET) as Record<string, unknown>;
    expect(j.id).toBe('042');
    expect(j.status).toBe('pendente');
  });

  it('os três concordam campo a campo', () => {
    const { raiz, arquivo } = escreverTicket();
    const shell = JSON.parse(ticketJsonDoShell(arquivo, raiz).saida);
    const gate = blocoJson(TICKET);
    expect(gate.ok).toBe(true);
    expect(shell).toEqual(gate.ok ? gate.json : null);
    expect(shell).toEqual(extractJsonBlock(TICKET));
  });
});

describe('a migração deixa de PULAR o ticket com dois blocos', () => {
  it('acharBloco continua contando os dois, e aponta para o PRIMEIRO', () => {
    const b = acharBloco(TICKET)!;
    expect(b.quantos).toBe(2);
    const linhas = TICKET.split('\n');
    expect(JSON.parse(linhas.slice(b.inicio, b.fim).join('\n')).id).toBe('042');
  });

  it('migra os dois renomes no PRIMEIRO bloco e não é mais pulado', () => {
    const r = migrarTicket(TICKET);
    expect(r.pulado).toBeUndefined();
    expect(r.depois).toBeTruthy();
    const depois = r.depois!;
    expect(depois).toContain('"tentativas": 1');
    expect(depois).toContain('"recon": "linhas > 0"');
    expect(depois).not.toContain('tentativas_consumidas');
    expect(depois).not.toContain('recon_esperado');
  });

  it('o SEGUNDO bloco sai byte a byte igual — prosa é intocável', () => {
    const segundo = (md: string) => md.slice(md.indexOf('## Contexto'));
    expect(segundo(migrarTicket(TICKET).depois!)).toBe(segundo(TICKET));
  });

  it('o ticket migrado continua sendo lido igual pelos três', () => {
    const depois = migrarTicket(TICKET).depois!;
    const { raiz, arquivo } = escreverTicket(depois);
    const shell = JSON.parse(ticketJsonDoShell(arquivo, raiz).saida);
    expect(shell.tentativas).toBe(1);
    expect(shell.id).toBe('042');
    expect(shell).toEqual(extractJsonBlock(depois));
  });
});

describe('ticket_set reescreve SÓ o primeiro bloco', () => {
  it('trocar o status não duplica nem toca o bloco da prosa', () => {
    const { raiz, arquivo } = escreverTicket();
    const r = bashNoFixture(raiz, `ticket_set "${arquivo}" '.status = $s' --arg s done`);
    expect(r.rc).toBe(0);
    const depois = readFileSync(arquivo, 'utf8');
    // Dois blocos ANTES, dois blocos DEPOIS: nada foi duplicado.
    expect((depois.match(/^```json$/gm) ?? []).length).toBe(2);
    expect(JSON.parse(ticketJsonDoShell(arquivo, raiz).saida).status).toBe('done');
    // O payload da prosa continua dizendo "done" porque SEMPRE disse — e o id
    // dele continua 999, prova de que não foi ele que o `ticket_set` reescreveu.
    expect(depois.slice(depois.indexOf('## Contexto'))).toContain('"id": "999"');
    expect(depois.slice(depois.indexOf('## Contexto'))).toContain('"linhas"');
  });
});

describe('o caso de UM bloco só — os 517 tickets do disco — não muda', () => {
  const umBloco = TICKET.slice(0, TICKET.indexOf('## Contexto'));

  it('os três leitores seguem concordando', () => {
    const { raiz, arquivo } = escreverTicket(umBloco);
    const shell = JSON.parse(ticketJsonDoShell(arquivo, raiz).saida);
    expect(shell).toEqual(extractJsonBlock(umBloco));
    expect(shell.id).toBe('042');
  });

  it('a migração faz o mesmo renome de sempre', () => {
    const r = migrarTicket(umBloco);
    expect(r.pulado).toBeUndefined();
    expect(r.depois).toContain('"tentativas": 1');
  });
});

describe('o CONTRATO diz o que o código faz', () => {
  const contrato = readFileSync(join(REPO_ROOT, 'CONTRATO.md'), 'utf8');

  it('§2 diz PRIMEIRO bloco', () => {
    expect(contrato).toMatch(/fonte\s*\n?de verdade de máquina\*\* é o PRIMEIRO bloco/);
  });

  it('a divergência 10 está FECHADA e nomeia a peça', () => {
    const linha = contrato.split('\n').find((l) => l.startsWith('| 10 |'))!;
    expect(linha).toMatch(/FECHADA/);
    expect(linha).toMatch(/D10/);
  });
});
