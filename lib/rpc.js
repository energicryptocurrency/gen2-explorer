
const settings = require('../lib/settings');
const energidrpc = require('@energicryptocurrency/energid-rpc');
const $as = require('futoin-asyncsteps');
const Limiter = require('futoin-asyncsteps/Limiter');

//---
const rpc = new energidrpc(settings.wallet);
rpc.rpc = true;
rpc.cmd = (commands, cb) => {
    const { method, params } = commands[0];
    const func = rpc[method] || energidrpc.prototype[method];

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

//---
const api_limiter = new Limiter(settings.apilimit);
const CACHE_TIME = settings.apilimit.cache || 5;
const limit_call = (m) => {
    let cache = undefined;
    let cache_time = process.hrtime();

    return (...params) => {
        // Do not cache less regular calls without parameters
        const do_cache = (params.length === 1);
        const cb = params[params.length - 1];

        // Check if valid cache
        if (do_cache && cache !== undefined) {
            if (process.hrtime(cache_time)[0] < CACHE_TIME) {
                cb(undefined, cache);
                return;
            }

            cache = undefined;
        }

        $as()
            .add(
                (asi) => asi.sync(api_limiter, (asi) => {
                    // Check if valid cache appeared while waiting
                    if (cache !== undefined) {
                        asi.success(undefined, cache);
                    } else {
                        params[params.length - 1] = (err, rsp) => {
                            if (!err && do_cache && rsp) {
                                cache = rsp;
                                cache_time = process.hrtime();
                            }

                            asi.success(err, rsp);
                        };
                        m.apply(rpc, params);
                        asi.waitExternal();
                    }
                }),
                (asi, err) => asi.success(err)
            ).add((asi, err, rsp) => cb(err, rsp))
            .execute();
    };
};

if (!global.CRON_JOB) {
    for (let k in energidrpc.prototype) {
        rpc[k] = limit_call(energidrpc.prototype[k]);
    }
}

Object.seal(rpc);

module.exports = rpc;
