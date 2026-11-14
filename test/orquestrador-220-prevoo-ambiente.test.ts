/**
 * Etapa 2.2.0, defeitos A1-10 e A1-11, pelo CLI real do pré-voo
 * (`prevoo.ts <checkout>`) sobre o repo de fixture instanciado.
 *
 * A1-10: com só `node_modules/` (com barra) no .gitignore, o symlink
 * node_modules da worktree aparece como arquivo solto e todo ticket reprova por
 * `arquivo_solto` (1ª drenagem do escritorio-os). O pré-voo tem de sair NO-GO
 * citando a linha que falta.
 *
 * A1-11 (AP-060): a alvo tem de conter a principal. Principal à frente (conserto
 * de ambiente commitado só nela) ou as duas divergidas = NO-GO com o comando
 * exato de conserto no motivo.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkoutReal, REPO_ROOT } from './fixtures/orq-harness.js'

const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const fx = checkoutReal()
const git = (...a: string[]) =>
  spawnSync('git', ['-C', fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
const prevoo = () => {
  const r = spawnSync(TSX, [join(fx, 'scripts', 'orquestrador', 'prevoo.ts'), fx], { encoding: 'utf8' })
  return { rc: r.status, out: `${r.stdout}${r.stderr}` }
}

describe('A1-10 · pré-voo acusa .gitignore sem `node_modules` sem barra', () => {
  it('só `node_modules/`: NO-GO cat.11 citando a linha; com a linha de volta: GO', () => {
    const gi = join(fx, '.gitignore')
    const original = readFileSync(gi, 'utf8')
    try {
      writeFileSync(gi, original.replace(/^node_modules$\n/m, ''))
      expect(readFileSync(gi, 'utf8')).toMatch(/^node_modules\/$/m)
      const r = prevoo()
      expect(r.rc, r.out).toBe(1)
      expect(r.out).toMatch(/^NO-GO cat\.11 .*`node_modules` \(sem barra\)/m)
    } finally {
      writeFileSync(gi, original)
    }
    const ok = prevoo()
    expect(ok.rc, ok.out).toBe(0)
  }, 60_000)
})

describe('A1-11 · pré-voo exige que a alvo contenha a principal', () => {
  it('principal à frente: NO-GO cat.12 com o fast-forward exato; depois do comando, GO', () => {
    const antes = git('rev-parse', 'main').stdout.trim()
    writeFileSync(join(fx, 'conserto-de-ambiente.txt'), 'x\n')
    git('add', 'conserto-de-ambiente.txt')
    git('commit', '-q', '-m', 'conserto de ambiente só na main')
    const r = prevoo()
    expect(r.rc, r.out).toBe(1)
    expect(r.out).toMatch(/^NO-GO cat\.12 · staging-auto contém main .*Conserto \(fast-forward, sem perda\): git -C \S+ fetch \. main:staging-auto/m)
    // o comando do motivo, rodado como está, conserta
    expect(git('fetch', '.', 'main:staging-auto').status).toBe(0)
    const ok = prevoo()
    expect(ok.rc, ok.out).toBe(0)
    expect(git('rev-parse', 'staging-auto').stdout.trim()).not.toBe(antes)
  }, 60_000)

  it('divergidas: NO-GO cat.12 dizendo que o ff é impossível, com merge --no-ff de conserto', () => {
    const alvo0 = git('rev-parse', 'staging-auto').stdout.trim()
    const main0 = git('rev-parse', 'main').stdout.trim()
    writeFileSync(join(fx, 'so-na-main.txt'), 'x\n')
    git('add', 'so-na-main.txt')
    git('commit', '-q', '-m', 'só na main')
    git('update-ref', 'refs/heads/staging-auto', git('commit-tree', `${alvo0}^{tree}`, '-p', alvo0, '-m', 'só na alvo').stdout.trim())
    try {
      const r = prevoo()
      expect(r.rc, r.out).toBe(1)
      expect(r.out).toMatch(/^NO-GO cat\.12 .*divergiram.*merge --no-ff main/m)
    } finally {
      git('update-ref', 'refs/heads/staging-auto', alvo0)
      git('reset', '-q', '--hard', main0)
    }
  }, 60_000)

  it('principal à frente SÓ na fila (status do loop): GO — o promotor sincroniza', () => {
    const main0 = git('rev-parse', 'main').stdout.trim()
    const alvo0 = git('rev-parse', 'staging-auto').stdout.trim()
    writeFileSync(join(fx, 'docs', 'fila', '900-status.md'), '# 900\n')
    git('add', 'docs/fila/900-status.md')
    git('commit', '-q', '-m', 'fila: 900 done')
    try {
      const r = prevoo()
      expect(r.out).toMatch(/^ok +cat\.12 /m)
      expect(r.rc, r.out).toBe(0)
    } finally {
      git('reset', '-q', '--hard', main0)
      git('update-ref', 'refs/heads/staging-auto', alvo0)
    }
  }, 60_000)
})

describe('A1-10 · instalar.sh --atualizar acrescenta `node_modules` sem barra', () => {
  it('repo com só `node_modules/`: depois do --atualizar o symlink x/node_modules não aparece no porcelain', () => {
    const gi = join(fx, '.gitignore')
    const original = readFileSync(gi, 'utf8')
    writeFileSync(gi, original.replace(/^node_modules$\n/m, ''))
    git('add', '.gitignore')
    git('commit', '-q', '-m', 'gitignore só com node_modules/')
    const sonda = () => {
      spawnSync('bash', ['-c', `cd '${fx}' && mkdir -p x && ln -sfn ../node_modules x/node_modules`])
      const p = git('status', '--porcelain', '--untracked-files=all').stdout
      spawnSync('rm', ['-rf', join(fx, 'x')])
      return p
    }
    // controle positivo no MESMO teste: antes do instalador o symlink aparece
    expect(sonda()).toMatch(/x\/node_modules/)
    // o instalador só atualiza com o loop pausado (recusa 1)
    writeFileSync(join(fx, 'docs', 'fila', 'PAUSAR'), 'teste\n')
    const r = spawnSync('bash', [join(REPO_ROOT, 'instalar.sh'), '--atualizar', fx], { encoding: 'utf8' })
    expect(`${r.stdout}${r.stderr}`).toMatch(/\.gitignore: \+node_modules/)
    expect(readFileSync(gi, 'utf8')).toMatch(/^node_modules$/m)
    expect(sonda()).not.toMatch(/x\/node_modules/)
    // segunda vez não duplica
    spawnSync('bash', [join(REPO_ROOT, 'instalar.sh'), '--atualizar', fx], { encoding: 'utf8' })
    expect(readFileSync(gi, 'utf8').match(/^node_modules$/gm)).toHaveLength(1)
    git('checkout', '-q', '--', '.')
    spawnSync('rm', ['-f', join(fx, 'docs', 'fila', 'PAUSAR')])
  }, 120_000)
})
