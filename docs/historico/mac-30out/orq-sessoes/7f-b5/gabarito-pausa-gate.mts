// gabarito da peça 7 (7f-b5): o veredito de cada pausa de gate sistêmico do Comarka. SÓ LEITURA.
// uso: <kit>/node_modules/.bin/tsx ~/orq-sessoes/7f-b5/gabarito-pausa-gate.ts <worktree do kit>
const kit = process.argv[2]
const { vereditoDaPausa } = await import(`${kit}/scripts/orquestrador/resolvedor/gate-streak.ts`)
const R = '/Users/lucasantos/Projetos/comarka-operacional'
// [gate, A, B, em (UTC, do sentinela/csv), verdade humana (medicao-bloqueios-out.md §pausas; '?' = sem registro)]
const casos: [string, string, string, string, string][] = [
  ['vitest', '317', '391a', '2026-09-16T17:23:27Z', '?'],
  ['criterio', '406', '408', '2026-09-17T16:34:45Z', '?'],
  ['criterio', '406', '408', '2026-09-17T19:05:32Z', '?'],
  ['vitest', '801', '802', '2026-10-04T18:56:44Z', 'ambiente: máquina (igual ao 801)'],
  ['vitest', '760', '761', '2026-10-05T15:32:25Z', 'base vermelha (760)'],
  ['vitest', '762', '851', '2026-10-05T18:35:47Z', 'falso positivo (2 defeitos de spec independentes)'],
  ['vitest', '898', '741a', '2026-10-08T14:14:28Z', 'base vermelha (useAcaoUnica)'],
  ['vitest', '741a', '707', '2026-10-08T14:58:20Z', 'base vermelha (useAcaoUnica)'],
  ['vitest', '1009', '953', '2026-10-11T17:41:00Z', '?'],
]
for (const [gate, a, b, em, verdade] of casos) {
  const v = vereditoDaPausa(R, { gate, tickets: [a, b], em }, Date.parse(em) / 1000)
  console.log(JSON.stringify({ par: `${a},${b}`, gate, em, veredito: v.tipo, motivo: v.motivo, lidos: v.lidos.map((l: { ticket: string; arquivo: string | null; falharam: string[]; maquina: boolean }) => `${l.ticket}: ${l.arquivo ?? '-'} [${l.falharam.join(' ')}]${l.maquina ? ' MAQUINA' : ''}`), verdade }))
}
