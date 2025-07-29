'use strict'
const daemon = require('bare-daemon')
const path = require('bare-path')
const sodium = require('sodium-native')
const { isWindows } = require('which-runtime')
const opwait = require('pear-api/opwait')
const { ERR_OPERATION_FAILED, ERR_INTERNAL_ERROR, ERR_INVALID_INPUT } = require('pear-api/errors')
const updaterBootstrap = require('pear-updater-bootstrap')

function flagifyDhtBootstrap (input) {
  if (!input) return []
  if (typeof input === 'string') return ['--dht-bootstrap', input]
  if (Array.isArray(input) === false) input = [input]
  return ['--dht-bootstrap', input.map((n) => {
    if (typeof n === 'string') return n
    if (typeof n === 'number') return '127.0.0.1:' + n
    if (n?.host && n?.port) return `${n.host}:${n.port}`
    throw new Error('Invalid node format')
  }).join(',')]
}

function pipeId (s) {
  const buf = Buffer.allocUnsafe(32)
  sodium.crypto_generichash(buf, Buffer.from(s))
  return buf.toString('hex')
}

async function bootstrap (opts = {}) {
  let dhtBootstrap = opts.dhtBootstrap
  const args = dhtBootstrap ? ['--sidecar', ...flagifyDhtBootstrap(dhtBootstrap)] : ['--sidecar']
  dhtBootstrap = dhtBootstrap?.split(',').map((tuple) => {
    const [host, port] = tuple.split(':')
    const int = +port
    if (Number.isInteger(int) === false) throw new Error(`Invalid port: ${port}`)
    return { host, port: int }
  })
  const { pearKey, pearDir, appLink, useLock, onupdater, onstatus } = opts
  await updaterBootstrap(pearKey, pearDir, { lock: useLock, bootstrap: dhtBootstrap, onupdater })
  if (!appLink) throw new ERR_INVALID_INPUT('appLink is required')
  if (appLink.startsWith('pear:') === false) throw new ERR_INVALID_INPUT('appLink must be pear:// link')
  const runtime = path.join(pearDir, 'current', 'by-arch', require.addon.host, 'bin', 'pear-runtime' + (isWindows ? '.exe' : ''))
  const { Client } = require('pear-ipc')
  const ipc = new Client({
    lock: path.join(pearDir, 'corestores', 'platform', 'db', 'LOCK'),
    connect: () => { daemon.spawn(runtime, args, { cwd: pearDir }) },
    socketPath: isWindows ? `\\\\.\\pipe\\pear-${pipeId(pearDir)}` : `${pearDir}/pear.sock`

  })
  await ipc.ready()
  const stream = ipc.run({ link: appLink, flags: { preflight: true, trusted: true } })
  const result = await opwait(stream, onstatus)
  await ipc.close()
  const bail = result?.bail ?? ERR_INTERNAL_ERROR('Expected PREFLIGHT bail')
  if (bail.code !== 'PREFLIGHT') throw ERR_OPERATION_FAILED(bail.stack ?? bail.message ?? bail.code, bail.info)
}

module.exports = bootstrap
