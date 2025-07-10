'use strict'
const daemon = require('bare-daemon')
const path = require('bare-path')
const { isWindows } = require('which-runtime')
const opwait = require('pear-api/opwait')
const { ERR_OPERATION_FAILED, ERR_INTERNAL_ERROR } = require('pear-api/errors')
const updaterBootstrap = require('pear-updater-bootstrap')

function serializeDhtBootstrap (input) {
  if (typeof input === 'string') return input
  if (Array.isArray(input) === false) input = [input]
  return input.map((n) => {
    if (typeof n === 'string') return n
    if (typeof n === 'number') return '127.0.0.1:' + n
    if (n?.host && n?.port) return `${n.host}:${n.port}`
    throw new Error('Invalid node format')
  }).join(',')
}

async function bootstrap (opts = {}) {
  const { pearKey, pearDir, appLink, useLock, dhtBootstrap, onupdater, onstatus } = opts
  await updaterBootstrap(pearKey, pearDir, { lock: useLock, bootstrap: dhtBootstrap, onupdater })
  const runtime = path.join(pearDir, 'current', 'by-arch', require.addon.host, 'bin', 'pear-runtime' + (isWindows ? '.exe' : ''))
  const args = dhtBootstrap ? ['--sidecar', serializeDhtBootstrap(dhtBootstrap) ] : ['--sidecar']
  const { Client } = require('pear-ipc')
  const ipc = new Client({
    lock: path.join(pearDir, 'corestores', 'platform', 'db', 'LOCK'),
    connect: () => daemon.spawn(runtime, args, { cwd: pearDir }),
    socketPath: isWindows ? `\\\\.\\pipe\\pear-${pipeId(pearDir)}` : `${pearDir}/pear.sock`
  })
  const result = await opwait(ipc.run({ link: appLink, flags: { preflight: true }}), onstatus)
  await ipc.close()
  const bail = result?.bail ?? ERR_INTERNAL_ERROR('Expected PREFLIGHT bail')
  if (bail.code !== 'PREFLIGHT') throw ERR_OPERATION_FAILED(bail.stack ?? bail.message ?? bail.code, bail.info)
}

module.exports = bootstrap