const hypercoreid = require('hypercore-id-encoding')
const bootstrap = require('..')

console.log('Bootstrapping...')
bootstrap({
  pearKey: hypercoreid.decode('dhpc5npmqkansx38uh18h3uwpdp6g9ukozrqyc4irbhwriedyeho'),
  pearDir: __dirname,
  appLink: 'pear://rbw6fbxorqgjgyitworh3f73utc5cu7sczhptn64oonbznuojiao'
})
