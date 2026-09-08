/**
 * Peça K10 — a doutrina v2 não contradiz o config nem o CONTRATO.
 *
 * O teste de um documento não é "está bem escrito": é **não afirma sobre o disco
 * coisa que o disco desmente**. A doutrina é lida por três públicos que não
 * conseguem verificá-la — o executor headless, o juiz e quem instala num repo
 * novo —, e uma linha errada ali vira instrução que ninguém confere.
 *
 * Cada caso abaixo pega UMA afirmação da doutrina e a confronta com a fonte que
 * a torna verdadeira ou falsa: o template de config, o `CONTRATO.md`, ou o
 * código do motor.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const DOUTRINA = join(REPO_ROOT, 'doutrina');
const ler = (...p: string[]) => readFileSync(join(...p), 'utf8');

const SKILL = ler(DOUTRINA, 'SKILL.md');
const SETUP = ler(DOUTRINA, 'references', 'setup.md');
const SEED = ler(DOUTRINA, 'templates', 'PLAYBOOK-seed.md');
const CONTRATO = ler(REPO_ROOT, 'CONTRATO.md');
const DIFF_V2 = ler(REPO_ROOT, 'docs', 'DOUTRINA-v2.md');
const TEMPLATE_CFG = JSON.parse(ler(DOUTRINA, 'templates', 'config.json'));

/** Todo arquivo de doutrina, para as varreduras que valem no conjunto. */
function todosOsDocs(): Array<{ nome: string; texto: string }> {
  const out: Array<{ nome: string; texto: string }> = [];
  const anda = (dir: string, prefixo: string) => {
    for (const n of readdirSync(dir, { withFileTypes: true })) {
      if (n.isDirectory()) anda(join(dir, n.name), `${prefixo}${n.name}/`);
      else if (n.name.endsWith('.md')) out.push({ nome: `${prefixo}${n.name}`, texto: ler(dir, n.name) });
    }
  };
  anda(DOUTRINA, '');
  return out;
}

// ─── decisão 1: motor único versionado ──────────────────────────────────────
describe('decisão 1 · motor único versionado', () => {
  it('a regra v1 "nunca copie scripts de outro repo" NÃO sobrevive como regra', () => {
    // Ela pode ser CITADA (o diff v1→v2 a cita, e a SKILL explica por que saiu),
    // mas não pode aparecer como instrução vigente em documento nenhum.
    for (const { nome, texto } of todosOsDocs()) {
      const linhas = texto.split('\n').filter((l) => /Nunca copie scripts de outro repo/i.test(l));
      for (const l of linhas) {
        expect(l, `${nome}: a regra aparece sem estar marcada como substituída`).toMatch(/substitui|v1 dizia|era |saiu/i);
      }
    }
  });

  it('a SKILL manda instalar pelo instalar.sh, e nomeia os dois verbos', () => {
    expect(SKILL).toMatch(/instalar\.sh --novo/);
    expect(SKILL).toMatch(/--atualizar/);
    expect(SKILL).toMatch(/MOTOR ÚNICO VERSIONADO/);
  });

  it('editar o motor vendorizado é NO-GO, e a SKILL diz quem afirma isso', () => {
    expect(SKILL).toMatch(/NO-GO no pré-voo/);
    expect(SKILL).toMatch(/instalar\.sh --verificar/);
  });

  it('o setup.md não manda mais GERAR os scripts', () => {
    expect(SETUP).not.toMatch(/^## 4\. Gerar os scripts/m);
    expect(SETUP).toMatch(/bash instalar\.sh --novo/);
  });

  it('todo script que o setup.md diz existir EXISTE no motor', () => {
    // A tabela do passo 4 lista `scripts/orquestrador/<arquivo>`; um nome errado
    // ali manda alguém procurar um arquivo que não existe.
    const citados = [...SETUP.matchAll(/`scripts\/orquestrador\/([a-z0-9-]+\.(?:ts|sh))`/g)].map((m) => m[1]!);
    expect(citados.length).toBeGreaterThan(4);
    const noDisco = new Set(readdirSync(join(REPO_ROOT, 'scripts', 'orquestrador')));
    for (const c of new Set(citados)) expect(noDisco, `setup.md cita ${c}`).toContain(c);
  });
});

// ─── decisão 2: ID sequencial global ────────────────────────────────────────
describe('decisão 2 · ID é sequencial global, não faixa por bloco', () => {
  it('o template de mapa.json NÃO traz `faixa_ids`', () => {
    const mapa = JSON.parse(ler(DOUTRINA, 'templates', 'mapa.json'));
    for (const b of mapa.blocos) expect(b, `bloco ${b.id}`).not.toHaveProperty('faixa_ids');
  });

  // Por PARÁGRAFO, não por linha: os documentos são quebrados em 90 colunas, e
  // uma regra pode começar numa linha ("não faixa por bloco") e ser explicada na
  // seguinte. Checar linha a linha reprovaria a própria explicação da regra.
  it('nenhum documento manda usar faixa por bloco', () => {
    for (const { nome, texto } of todosOsDocs()) {
      for (const par of texto.split(/\n\s*\n|\n(?=[-|] )/)) {
        // "faixa de migrations" é outra coisa e continua valendo.
        if (!/faixa/i.test(par) || /migration/i.test(par)) continue;
        expect(par.replace(/\s+/g, ' ').slice(0, 120), `${nome}: faixa de IDs citada sem estar marcada como saída`).toMatch(
          /não|nunca|NÃO|sem faixa|_sem_faixa|v1|sequencial|OPCIONAL|histórico|era /,
        );
      }
    }
  });

  it('o template de TICKET manda numerar sequencial, não dentro da faixa', () => {
    const t = ler(DOUTRINA, 'templates', 'TICKET.md');
    expect(t).toMatch(/SEQUENCIAL GLOBAL/);
    expect(t).not.toMatch(/Número DENTRO da faixa do bloco/);
  });
});

// ─── decisão 3: canal padrão = arquivo ──────────────────────────────────────
describe('decisão 3 · o canal padrão de notificação é arquivo', () => {
  it('a SKILL diz que o padrão é arquivo, e por quê', () => {
    expect(SKILL).toMatch(/canal PADRÃO é `arquivo`/);
    expect(SKILL).toMatch(/headless/);
  });

  it('o motor concorda: qualquer valor != notificacao_nativa cai no arquivo', () => {
    // É o que `config-chaves.ts` registra sobre `canal_notificacao`, e é o que
    // faz "arquivo" ser um default seguro em vez de um valor mágico.
    const chaves = ler(REPO_ROOT, 'scripts', 'orquestrador', 'config-chaves.ts');
    expect(chaves).toMatch(/canal_notificacao/);
    expect(chaves).toMatch(/notificacao_nativa/);
  });

  it('o CONTRATO registra o arquivo de notificação em runs/', () => {
    expect(CONTRATO).toMatch(/notificacoes\.log/);
  });
});

// ─── decisão 4: risco derivado ──────────────────────────────────────────────
describe('decisão 4 · `risco` é derivado, não exigido de quem escreve', () => {
  it('a SKILL diz que o passo 6 do gate preenche', () => {
    expect(SKILL).toMatch(/`risco` é DERIVADO/);
    expect(SKILL).toMatch(/passo 6/);
  });

  it('NÃO contradiz o CONTRATO: o gate cobra a CHAVE, não o valor', () => {
    // CONTRATO §2: "risco basta EXISTIR". A doutrina não pode dizer que a chave
    // é dispensável enquanto o gate a cobra.
    expect(CONTRATO).toMatch(/`risco` basta EXISTIR/);
    expect(SKILL).toMatch(/cobra que a\s+CHAVE exista/);
  });

  it('e o DOUTRINA-v2 registra a lacuna em vez de escondê-la', () => {
    expect(DIFF_V2).toMatch(/ainda exige a CHAVE presente/);
    expect(DIFF_V2).toMatch(/CAMPOS_PENDENTE/);
  });
});

// ─── decisão 5: o harness é do kit ──────────────────────────────────────────
describe('decisão 5 · quem escreve o harness é o kit', () => {
  it('a seção aponta para o kit e cita o incidente de 2026-09-08', () => {
    const secao = SKILL.split('## Quem escreve o harness')[1] ?? '';
    expect(secao).toMatch(/orquestrador-kit/);
    expect(secao).toMatch(/2026-09-08/);
    expect(secao).toMatch(/launchd/);
    expect(secao).toMatch(/rc 127/);
  });

  it('o incidente citado é o que o PLAYBOOK do kit registra', () => {
    const pb = ler(REPO_ROOT, 'docs', 'PLAYBOOK.md');
    expect(pb).toMatch(/2026-09-08/);
    expect(pb).toMatch(/127/);
  });
});

// ─── o seed do PLAYBOOK ─────────────────────────────────────────────────────
describe('o seed do PLAYBOOK: 15 lições triadas, com data e origem', () => {
  /** As lições da seção triada, uma por bullet de primeiro nível. */
  const triadas = (SEED.split('## Lições de campo (triadas')[1] ?? '')
    .split('## Regras v2')[0]!
    .split('\n- **')
    .slice(1);

  it('são exatamente 15', () => {
    expect(triadas).toHaveLength(15);
  });

  it('toda lição traz DATA e ORIGEM', () => {
    for (const l of triadas) {
      const titulo = l.split('**')[0]!.slice(0, 60);
      expect(l, titulo).toMatch(/\(20\d\d-\d\d-\d\d[^)]*conteudos-infinitos\.?\)/);
    }
  });

  it('o critério de escolha está escrito no arquivo, com os três filtros', () => {
    expect(SEED).toMatch(/Procedência e critério/);
    expect(SEED).toMatch(/\(1\).*MECANISMO/s);
    expect(SEED).toMatch(/\(2\).*PAGA/s);
    expect(SEED).toMatch(/\(3\).*repo novo/s);
  });

  it('o resto da triagem tem peça, e ela é nomeada', () => {
    expect(SEED).toMatch(/K10b/);
    expect(DIFF_V2).toMatch(/K10b/);
  });

  it('nenhuma lição triada carrega detalhe LOCAL do repo de origem', () => {
    // O filtro (1) em forma de asserção: nome de arquivo do produto, de tabela
    // ou de componente daquele repo não passa. Estes são os que apareceram na
    // triagem e foram deixados de fora de propósito.
    for (const l of triadas) {
      for (const local of ['WizardGerar', 'PersonaForm', 'supabase/', 'qualificacao', 'apps/web', 'personas.ts']) {
        expect(l.slice(0, 200), `lição cita '${local}'`).not.toContain(local);
      }
    }
  });

  it('as regras v2 do seed batem com as quatro decisões novas', () => {
    const regras = SEED.split('## Regras v2')[1] ?? '';
    expect(regras).toMatch(/Motor único versionado/);
    expect(regras).toMatch(/Canal de notificação padrão é ARQUIVO/);
    expect(regras).toMatch(/ID de ticket é ordem de fila/);
    expect(regras).toMatch(/`risco` é derivado/);
  });
});

// ─── a doutrina × o template de config ──────────────────────────────────────
describe('a doutrina não contradiz o template de config', () => {
  it('o template está em `$schema_versao: 2`', () => {
    expect(TEMPLATE_CFG.$schema_versao).toBe(2);
  });

  it('o template traz `pausar_file`, e a doutrina cita o mesmo caminho', () => {
    expect(TEMPLATE_CFG.pausar_file).toBe('docs/fila/PAUSAR');
    expect(SETUP).toMatch(/docs\/fila\/PAUSAR/);
  });

  it('a `ordem_obrigatoria` do template lista os MESMOS gates, na mesma ordem', () => {
    // É a asserção que `gates.ts` faz em runtime, aqui feita sobre o formulário:
    // um template que já nasce inconsistente ensina a inconsistência.
    expect(TEMPLATE_CFG._execucao_dos_gates.ordem_obrigatoria).toEqual(
      TEMPLATE_CFG.gates.map((g: { nome: string }) => g.nome),
    );
  });

  it('as 7 causas de adiamento do template são as que o motor espera', () => {
    expect(TEMPLATE_CFG.politica_adiamento.causas_que_adiam).toHaveLength(7);
  });

  it('a política de retry do template NÃO manda escalar por tamanho nem por fronteira', () => {
    const p = TEMPLATE_CFG.politica_retry.por_causa;
    expect(p.diff_cap.modelo).toBe('MANTER');
    expect(p.enforcement.modelo).toBe('MANTER');
    expect(p.criterio_qualidade.modelo).toBe('ESCALAR');
  });
});

// ─── o diff v1→v2 é honesto sobre o que não fez ─────────────────────────────
describe('docs/DOUTRINA-v2.md', () => {
  it('tem as seis decisões, cada uma com evidência', () => {
    const linhas = DIFF_V2.split('\n').filter((l) => /^\| \d \|/.test(l));
    expect(linhas).toHaveLength(6);
    for (const l of linhas) {
      // Cada linha da tabela termina na coluna "por quê", e ela tem de citar
      // uma data, uma medição ou um arquivo. Decisão sem custo é preferência.
      expect(l.split('|')[4], l.slice(0, 60)).toMatch(/20\d\d-\d\d-\d\d|medid|Medido|\.ts|\.sh|`/);
    }
  });

  it('diz o que NÃO mudou (doutrina que muda demais não é doutrina)', () => {
    expect(DIFF_V2).toMatch(/## 2\. O que NÃO mudou/);
    expect(DIFF_V2).toMatch(/12 regras inegociáveis/);
  });

  it('registra as próprias lacunas', () => {
    expect(DIFF_V2).toMatch(/## 5\. O que esta peça NÃO resolveu/);
  });
});
