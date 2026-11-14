/**
 * Etapa 2.2.0, defeito A1-7 (2026-11-12 no defeitos-para-o-kit do escritorio-os):
 * num repo Next o `tsc --noEmit` acusava TS2769 em gate-ticket.ts, porque o
 * Next declara `NodeJS.ProcessEnv` com `readonly NODE_ENV` obrigatório e o
 * `env: { PATH, LC_ALL }` passado ao spawnSync deixa de ser ProcessEnv.
 *
 * A prova usa a MESMA augmentação que next/types/global.d.ts declara, sem
 * instalar o next: tsc sobre scripts/orquestrador com ela tem de sair limpo.
 * Controle: sem a augmentação também limpo (o conserto não depende do Next).
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { REPO_ROOT } from './fixtures/orq-harness.js'

const TSC = join(REPO_ROOT, 'node_modules', '.bin', 'tsc')

function tsc(comNext: boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'orq-tsc-next-'))
  const files = [join(REPO_ROOT, 'scripts', 'orquestrador', '**', '*.ts')]
  if (comNext) {
    writeFileSync(
      join(dir, 'next-env.d.ts'),
      "declare namespace NodeJS { interface ProcessEnv { readonly NODE_ENV: 'development' | 'production' | 'test' } }\n",
    )
    files.push(join(dir, 'next-env.d.ts'))
  }
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      extends: join(REPO_ROOT, 'tsconfig.json'),
      compilerOptions: { rootDir: '/', typeRoots: [join(REPO_ROOT, 'node_modules', '@types')] },
      include: files,
    }),
  )
  const r = spawnSync(TSC, ['--noEmit', '-p', join(dir, 'tsconfig.json')], { encoding: 'utf8' })
  return { rc: r.status, out: `${r.stdout}${r.stderr}` }
}

describe('A1-7 · tsc limpo em scripts/orquestrador num repo com next', () => {
  it('com a ProcessEnv do Next (NODE_ENV obrigatório): rc 0, sem TS2769', () => {
    const r = tsc(true)
    expect(r.out).not.toMatch(/TS2769/)
    expect(r.rc, r.out).toBe(0)
  }, 120_000)

  it('controle: sem a augmentação também rc 0', () => {
    const r = tsc(false)
    expect(r.rc, r.out).toBe(0)
  }, 120_000)
})
