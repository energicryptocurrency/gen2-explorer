
const settings = require('../lib/settings');
const energidrpc = require('@energicryptocurrency/energid-rpc');


const rpc = new energidrpc(settings.wallet);
rpc.rpc = true;
rpc.cmd = (commands, cb) => {
    const { method, params } = commands[0];
    const func = energidrpc.prototype[method];

    if (func) {
        params.push((err, rsp) => cb(err, rsp && rsp.result));
        func.apply(rpc, params);
    } else {
        rpc.batch(
            () => {
                // Only no-arg calls are not listed in the EnergiRPC
                rpc.batchedCalls = [{
                    jsonrpc: '2.0',
                    method,
                    params: [],
                    id: 0
                }];
            },
            (err, rsp) => {
                cb(err, rsp && rsp[0] && rsp[0].result);
            }
        );
    }
};

module.exports = rpc;
