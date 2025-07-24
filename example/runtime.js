const { decode } = require('hypercore-id-encoding')
const bootstrap = require('..')

console.log('Bootstrapping...')
bootstrap({
  pearKey: decode('pqbzjhqyonxprx8hghxexnmctw75mr91ewqw5dxe1zmntfyaddqy'), // production build
  pearDir: __dirname,
  appLink: 'pear://runtime'
})
