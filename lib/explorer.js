const request = require('request')
  , settings = require('./settings')
  , Address = require('../models/address')
  , rpc = require('./rpc');

module.exports = {

  convert_to_satoshi: function(amount, cb) {
    // fix to 8dp & convert to string
    var fixed = amount.toFixed(8).toString(); 
    // remove decimal (.) and return integer 
    return cb(parseInt(fixed.replace('.', '')));
  },

  get_hashrate: function(cb) {
    if (settings.index.show_hashrate == false) return cb('-');

    rpc.getMiningInfo(function (error, body) { //returned in mhash
        if (body && body.result && body.result.networkhashps) {
            const { networkhashps } = body.result;

            if (settings.nethash_units == 'K') {
                return cb((networkhashps / 1e3).toFixed(4));
            } else if (settings.nethash_units == 'M') {
                return cb((networkhashps / 1e6).toFixed(4));
            } else if (settings.nethash_units == 'G') {
                return cb((networkhashps / 1e9).toFixed(4));
            } else if (settings.nethash_units == 'H') {
                return cb((networkhashps).toFixed(4));
            } else if (settings.nethash_units == 'T') {
                return cb((networkhashps / 1e12).toFixed(4));
            } else if (settings.nethash_units == 'P') {
                return cb((networkhashps / 1e15).toFixed(4));
            } else {
                return cb(networkhashps.toFixed(4));
            }
        } else {
            return cb('-');
        }
    });
  },


  get_difficulty: function(cb) {
    rpc.getDifficulty((error, body) => cb(body && body.result));
  },

  get_connectioncount: function(cb) {
    rpc.getConnectionCount((error, body) => cb(body && body.result));
  },

  get_blockcount: function(cb) {
    rpc.getBlockCount((error, body) => cb(body && body.result));
  },

  get_blockhash: function(height, cb) {
    rpc.getBlockHash(height, (error, body) => cb(body && body.result));
  },

  get_block: function(hash, cb) {
    rpc.getBlock(hash, (error, body) => cb(body && body.result));
  },

  get_rawtransaction: function(hash, cb) {
    rpc.getRawTransaction(hash, 1, (error, body) => cb(body && body.result));
  },

  get_maxmoney: function(cb) {
    cb(new Error('Method not found'), undefined);
  },

  get_maxvote: function(cb) {
    cb(new Error('Method not found'), undefined);
  },

  get_vote: function(cb) {
    cb(new Error('Method not found'), undefined);
  },

  get_phase: function(cb) {
    cb(new Error('Method not found'), undefined);
  },

  get_reward: function(cb) {
    cb(new Error('Method not found'), undefined);
  },

  get_estnext: function(cb) {
    cb(new Error('Method not found'), undefined);
  },

  get_nextin: function(cb) {
    cb(new Error('Method not found'), undefined);
  },
  
  // synchonous loop used to interate through an array, 
  // avoid use unless absolutely neccessary
  syncLoop: function(iterations, process, exit){
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
      next:function(){
          if(done){
              if(shouldExit && exit){
                  exit(); // Exit if we're done
              }
              return; // Stop the loop if we're done
          }
          // If we're not finished
          if(index < iterations){
              index++; // Increment our index
              if (index % 100 === 0) { //clear stack
                setTimeout(function() {
                  process(loop); // Run our process, pass in the loop
                }, 1);
              } else {
                 process(loop); // Run our process, pass in the loop
              }
          // Otherwise we're done
          } else {
              done = true; // Make sure we say we're done
              if(exit) exit(); // Call the callback on exit
          }
      },
      iteration:function(){
          return index - 1; // Return the loop number we're on
      },
      break:function(end){
          done = true; // End the loop
          shouldExit = end; // Passing end as true means we still call the exit callback
      }
    };
    loop.next();
    return loop;
  },

  balance_supply: function(cb) {
    Address.find({}, 'balance').where('balance').gt(0).exec(function(err, docs) { 
      var count = 0;
      module.exports.syncLoop(docs.length, function (loop) {
        var i = loop.iteration();
        count = count + docs[i].balance;
        loop.next();
      }, function(){
        return cb(count);
      });
    });
  },

  get_supply: function(cb) {
      rpc.getTxOutSetInfo((error, body) => cb(body && body.result.total_amount));
  },

  is_unique: function(array, object, cb) {
    var unique = true;
    var index = null;
    module.exports.syncLoop(array.length, function (loop) {
      var i = loop.iteration();
      if (array[i].addresses == object) {
        unique = false;
        index = i;
        loop.break(true);
        loop.next();
      } else {
        loop.next();
      }
    }, function(){
      return cb(unique, index);
    });
  },

  calculate_total: function(vout, cb) {
    const total = vout.reduce((t, v) => t + v.amount, 0);
    return cb(total);
  },

  prepare_vout: function(vout, txid, vin, cb) {
    var arr_vout = [];
    var arr_vin = [];
    arr_vin = vin;
    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      // make sure vout has an address
      if (vout[i].scriptPubKey.type != 'nonstandard' && vout[i].scriptPubKey.type != 'nulldata') { 
        // check if vout address is unique, if so add it array, if not add its amount to existing index
        //console.log('vout:' + i + ':' + txid);
        module.exports.is_unique(arr_vout, vout[i].scriptPubKey.addresses[0], function(unique, index) {
          if (unique == true) {
            // unique vout
            module.exports.convert_to_satoshi(parseFloat(vout[i].value), function(amount_sat){
              arr_vout.push({addresses: vout[i].scriptPubKey.addresses[0], amount: amount_sat});
              loop.next();
            });
          } else {
            // already exists
            module.exports.convert_to_satoshi(parseFloat(vout[i].value), function(amount_sat){
              arr_vout[index].amount = arr_vout[index].amount + amount_sat;
              loop.next();
            });
          }
        });
      } else {
        // no address, move to next vout
        loop.next();
      }
    }, function(){
      if (vout[0].scriptPubKey.type == 'nonstandard') {
        if ( arr_vin.length > 0 && arr_vout.length > 0 ) {
          if (arr_vin[0].addresses == arr_vout[0].addresses) {
            //PoS
            arr_vout[0].amount = arr_vout[0].amount - arr_vin[0].amount;
            arr_vin.shift();
            return cb(arr_vout, arr_vin);
          } else {
            return cb(arr_vout, arr_vin);
          }
        } else {
          return cb(arr_vout, arr_vin);
        }
      } else {
        return cb(arr_vout, arr_vin);
      }
    });
  },

  get_input_addresses: function(input, vout, cb) {
    var addresses = [];
    if (input.coinbase) {
      var amount = 0;
      module.exports.syncLoop(vout.length, function (loop) {
        var i = loop.iteration();
          amount = amount + parseFloat(vout[i].value);  
          loop.next();
      }, function(){
        addresses.push({hash: 'coinbase', amount: amount});
        return cb(addresses);
      });
    } else {
      module.exports.get_rawtransaction(input.txid, function(tx){
        if (tx) {
          module.exports.syncLoop(tx.vout.length, function (loop) {
            var i = loop.iteration();
            if (tx.vout[i].n == input.vout) {
              //module.exports.convert_to_satoshi(parseFloat(tx.vout[i].value), function(amount_sat){
              if (tx.vout[i].scriptPubKey.addresses) {
                addresses.push({hash: tx.vout[i].scriptPubKey.addresses[0], amount:tx.vout[i].value});  
              }
                loop.break(true);
                loop.next();
              //});
            } else {
              loop.next();
            } 
          }, function(){
            return cb(addresses);
          });
        } else {
          return cb();
        }
      });
    }
  },

  prepare_vin: function(tx, cb) {
    var arr_vin = [];
    module.exports.syncLoop(tx.vin.length, function (loop) {
      var i = loop.iteration();
      module.exports.get_input_addresses(tx.vin[i], tx.vout, function(addresses){
        if (addresses && addresses.length) {
          //console.log('vin');
          module.exports.is_unique(arr_vin, addresses[0].hash, function(unique, index) {
            if (unique == true) {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat){
                arr_vin.push({addresses:addresses[0].hash, amount:amount_sat});
                loop.next();
              });
            } else {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat){
                arr_vin[index].amount = arr_vin[index].amount + amount_sat;
                loop.next();
              });
            }
          });
        } else {
          loop.next();
        }
      });
    }, function(){
      return cb(arr_vin);
    });
  }
};
