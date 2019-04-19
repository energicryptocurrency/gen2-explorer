const mongoose = require('mongoose')
  , lib = require('../lib/explorer')
  , db = require('../lib/database')
  , settings = require('../lib/settings')
  , request = require('request')
  , rpc = require('../lib/rpc');

var COUNT = 5000; //number of blocks to index

function exit() {
  mongoose.disconnect();
  process.exit(0);
}

var dbString = 'mongodb://' + settings.dbsettings.user;
dbString = dbString + ':' + settings.dbsettings.password;
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + '/' + settings.dbsettings.database;



mongoose.connect(dbString, function(err) {
  if (err) {
    console.log('Unable to connect to database: %s', dbString);
    console.log('Aborting');
    exit();
  } else {
    rpc.getPeerInfo(function (error, body) {
      if (error) {
        console.log('Unable to get peerinfo');
        console.log('Aborting');
        exit();
      }

      body = body.result;

      lib.syncLoop(body.length, function (loop) {
        var i = loop.iteration();
        var address = body[i].addr.split(':')[0];
        db.find_peer(address, function(peer) {
          if (peer) {
            // peer already exists
            loop.next();
          } else {
            request({uri: 'http://freegeoip.net/json/' + address, json: true}, function (error, response, geo) {
              db.create_peer({
                address: address,
                protocol: body[i].version,
                version: body[i].subver.replace('/', '').replace('/', ''),
                country: geo.country_name
              }, function(){
                loop.next();
              });
            });
          }
        });
      }, function() {
        exit();
      });
    });
  }
});
