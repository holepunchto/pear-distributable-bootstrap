'use strict' /* global Bare */
const test = require('brittle')
const sodium = require('sodium-native')
const fs = require('bare-fs')
const path = require('bare-path')
const streamx = require('streamx')
const hypercoreid = require('hypercore-id-encoding')
const { isWindows } = require('which-runtime')
const IPC = require('pear-ipc')

function override (o) {
  const mods = {}
  for (const [ns, exp] of Object.entries(o)) {
    const id = new URL(require.resolve(ns), 'file:').href
    if (!require.cache[id]) require('..')
    if (!require.cache[id]) throw new Error(ns + ' not a used dep')
    mods[id] = require.cache[id]
    mods[id].exports = exp
    for (const id of Object.keys(require.cache)) delete require.cache[id]
    for (const id of Object.keys(mods)) require.cache[id] = mods[id]
  }
  return () => {
    for (const id of Object.keys(require.cache)) delete require.cache[id]
  }
}
function rig () {
  const buf = Buffer.allocUnsafe(4)
  sodium.randombytes_buf(buf)
  return path.join(__dirname, 'rig', 'pear')
}
function pipeId (s) {
  const buf = Buffer.allocUnsafe(32)
  sodium.crypto_generichash(buf, Buffer.from(s))
  return buf.toString('hex')
}

Bare.on('exit', () => {
  fs.rmSync(path.join(__dirname, 'rig'), { recursive: true })
})

test('executes pear-updater-bootstrap', async ({ plan, is, alike, teardown }) => {
  plan(5)
  const reset = override({
    'pear-updater-bootstrap': async (key, directory, opts) => {
      is(key, options.pearKey)
      is(directory, options.pearDir)
      is(opts.lock, options.useLock)
      alike(opts.bootstrap, [{ host: '127.0.0.1', port: 9999 }])
      is(opts.onupdater, options.onupdater)
    },
    'bare-daemon': { spawn (bin, args, opts) {} }
  })
  teardown(reset)
  const options = {
    appLink: 'pear://keet',
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    dhtBootstrap: '127.0.0.1:9999',
    onupdater: () => {}
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })
  const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
  const server = new IPC.Server({
    lock,
    socketPath,
    handlers: {
      run (params) {
        const stream = new streamx.PassThrough()
        stream.push({ tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
        stream.push(null)
        return stream
      }
    }
  })
  await server.ready()
  teardown(() => server.close())
  const bootstrap = require('..')
  await bootstrap(options)
})

test('appLink is required', async ({ exception, plan, teardown }) => {
  plan(1)
  const reset = override({
    'pear-updater-bootstrap': async (key, directory, opts) => {},
    'bare-daemon': { spawn (bin, args, opts) {} }
  })
  teardown(reset)
  const options = {
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    dhtBootstrap: '127.0.0.1:9999',
    onupdater: () => {}
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })
  const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
  const server = new IPC.Server({
    lock,
    socketPath,
    handlers: {
      run (params) {
        const stream = new streamx.PassThrough()
        stream.push({ tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
        stream.push(null)
        return stream
      }
    }
  })
  await server.ready()
  teardown(() => server.close())
  const bootstrap = require('..')
  await exception(() => bootstrap(options))
})

test('appLink must be a pear:// link', async ({ exception, plan, teardown }) => {
  plan(1)
  const reset = override({
    'pear-updater-bootstrap': async () => {},
    'bare-daemon': { spawn () {} }
  })
  teardown(reset)
  const options = {
    appLink: 'http://invalid-link',
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    dhtBootstrap: '127.0.0.1:9999',
    onupdater: () => {}
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })
  const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
  const server = new IPC.Server({
    lock,
    socketPath,
    handlers: {
      run () {
        const stream = new streamx.PassThrough()
        stream.push({ tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
        stream.push(null)
        return stream
      }
    }
  })
  await server.ready()
  teardown(() => server.close())
  const bootstrap = require('..')
  await exception(() => bootstrap(options))
})

test('throws on non-PREFLIGHT bail', async ({ exception, plan, teardown }) => {
  plan(1)
  const reset = override({
    'pear-updater-bootstrap': async () => {},
    'bare-daemon': { spawn () {} }
  })
  teardown(reset)
  const options = {
    appLink: 'pear://keet',
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    dhtBootstrap: '127.0.0.1:9999',
    onupdater: () => {}
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })
  const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
  const server = new IPC.Server({
    lock,
    socketPath,
    handlers: {
      run () {
        const stream = new streamx.PassThrough()
        stream.push({ tag: 'final', data: { bail: { code: 'ERR_CONNECTION', message: 'fail' } } })
        stream.push(null)
        return stream
      }
    }
  })
  await server.ready()
  teardown(() => server.close())
  const bootstrap = require('..')
  await exception(() => bootstrap(options))
})

test('tryboots sidecar', async ({ plan, is, alike, teardown }) => {
  plan(3)
  const reset = override({
    'pear-updater-bootstrap': async () => {},
    'bare-daemon': {
      spawn (bin, args, opts) {
        is(bin, path.join(options.pearDir, 'current', 'by-arch', require.addon.host, 'bin', 'pear-runtime' + (isWindows ? '.exe' : '')))
        alike(args, ['--sidecar'])
        alike(opts, { cwd: options.pearDir })
        const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
        const server = new IPC.Server({
          lock,
          socketPath,
          handlers: {
            run () {
              const stream = new streamx.PassThrough()
              stream.push({ tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
              stream.push(null)
              return stream
            }
          }
        })
        teardown(() => server.close())
        server.ready().catch(console.error)
      }
    }
  })
  teardown(reset)
  const options = {
    appLink: 'pear://keet',
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    onupdater: () => {}
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })

  const bootstrap = require('..')
  await bootstrap(options)
})

test('tryboots sidecar, passes --dht-bootstrap', async ({ plan, is, alike, teardown }) => {
  plan(3)
  const reset = override({
    'pear-updater-bootstrap': async () => {},
    'bare-daemon': {
      spawn (bin, args, opts) {
        is(bin, path.join(options.pearDir, 'current', 'by-arch', require.addon.host, 'bin', 'pear-runtime' + (isWindows ? '.exe' : '')))
        alike(args, ['--sidecar', '--dht-bootstrap', '127.0.0.1:9999'])
        alike(opts, { cwd: options.pearDir })
        const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
        const server = new IPC.Server({
          lock,
          socketPath,
          handlers: {
            run () {
              const stream = new streamx.PassThrough()
              stream.push({ tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
              stream.push(null)
              return stream
            }
          }
        })
        teardown(() => server.close())
        server.ready().catch(console.error)
      }
    }
  })
  teardown(reset)
  const options = {
    appLink: 'pear://keet',
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    dhtBootstrap: '127.0.0.1:9999',
    onupdater: () => {}
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })

  const bootstrap = require('..')
  await bootstrap(options)
})

test('calls ipc.run', async ({ plan, is, alike, teardown }) => {
  plan(2)
  const reset = override({
    'pear-updater-bootstrap': async () => {},
    'bare-daemon': { spawn () {} }
  })
  teardown(reset)
  const options = {
    appLink: 'pear://keet',
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    dhtBootstrap: '127.0.0.1:9999',
    onupdater: () => {}
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })
  const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
  const server = new IPC.Server({
    lock,
    socketPath,
    handlers: {
      run (params) {
        is(params.link, options.appLink)
        is(params.flags.preflight, true)
        const stream = new streamx.PassThrough()
        stream.push({ tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
        stream.push(null)
        return stream
      }
    }
  })
  await server.ready()
  teardown(() => server.close())
  const bootstrap = require('..')
  await bootstrap(options)
})

test('onstatus', async ({ plan, is, alike, teardown }) => {
  plan(3)
  const reset = override({
    'pear-updater-bootstrap': async () => {},
    'bare-daemon': { spawn () {} }
  })
  let count = 0
  teardown(reset)
  const options = {
    appLink: 'pear://keet',
    pearKey: hypercoreid.decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'),
    pearDir: rig(),
    useLock: false,
    dhtBootstrap: '127.0.0.1:9999',
    onupdater: () => {},
    onstatus (status) {
      if (count === 0) alike(status, { tag: 'status', data: { some: 'status' } })
      else if (count === 1) alike(status, { tag: 'status', data: { another: 'status' } })
      else if (count === 2) alike(status, { tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
      count++
    }
  }
  teardown(() => { try { fs.unlinkSync(options.pearDir) } catch {} })
  const lock = path.join(options.pearDir, 'corestores', 'platform', 'db', 'LOCK')
  fs.mkdirSync(path.resolve(lock, '..'), { recursive: true })
  const socketPath = isWindows ? `\\\\.\\pipe\\pear-${pipeId(options.pearDir)}` : `${options.pearDir}/pear.sock`
  const server = new IPC.Server({
    lock,
    socketPath,
    handlers: {
      run () {
        const stream = new streamx.PassThrough()
        stream.push({ tag: 'status', data: { some: 'status' } })
        stream.push({ tag: 'status', data: { another: 'status' } })
        stream.push({ tag: 'final', data: { bail: { code: 'PREFLIGHT' } } })
        stream.push(null)
        return stream
      }
    }
  })
  await server.ready()
  teardown(() => server.close())
  const bootstrap = require('..')
  await bootstrap(options)
})
