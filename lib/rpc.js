
const settings = require('../lib/settings');
const energidrpc = require('@energicryptocurrency/energid-rpc');

const rpc = new energidrpc(settings.wallet);

module.exports = rpc;
