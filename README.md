`Energi Explorer` is an open source block explorer written in [node.js](https://nodejs.org/). It was forked from [Iquidus Explorer](https://github.com/energicryptocurrency/explorer) 1.6.1. You can see it in action at [Energi Blockchain Explorer](https://explore.energi.network/).

To run the software basically means that you're running four different processes at the same time on your computer, more specifically:

1. The `Energi Explorer` program itself,
2. a separate [node.js](https://nodejs.org/) script that on a regular basis fetches blockchain data from
3. an [Energi Core](https://www.energi.world/downloads/) wallet
4. and stores it in a database managed by a [MongoDB](https://www.mongodb.com/what-is-mongodb) session.


# 1. Getting started

What follows is a step-by-step instructions how to get up and running with the software. Depending on your setup, you might have to run some of the commands specified below with `sudo`.


## 1.1 Requirements
Before starting, you need to make sure you have the following software installed and ready to go:

* [MongoDB](https://www.mongodb.com/what-is-mongodb)
* [Energi Core](https://www.energi.world/downloads/)
* [git](https://git-scm.com/)
* [node.js](https://nodejs.org/)


## 1.2 Starting the database manager

First, we need to set up a database where the blockchain data will be stored. `MongoDB` defaults to storing everything in `/data/db/` so we'll create these folders and give them write permissions.

    cd /
    mkdir data
    chmod +w data
    cd data
    mkdir db
    chmod +w data

Now, start up a `MongoDB` session by typing.

    mongod

Start up a new terminal window (leave the previous terminal session around in order to monitor activity) and enter the `MongoDB` command line interface by typing the following in the terminal:

    mongo

Then, within the `MongoDB` command line interface, create a database:

    use explorerdb

...and create a user with read/write access:

    db.createUser( { user: "iquidus", pwd: "3xp!0reR", roles: [ "readWrite" ] } )

Then exit the `MongoDB` command line interface by typing:

    exit


## 1.3 Starting the wallet

Start up the `Energi Core` wallet (at least the following flags must be active: `-daemon` `-txindex`) and go to `Tools > Open Wallet Configuration File`. Here, we'll set up the wallet for [remote procedure calls (RPC)](https://en.bitcoin.it/wiki/Bitcoind) by adding the following settings (you can of course change the username and password to something of your own):

    rpcuser=energirpc
    rpcpassword=123gfjk3R3pCCVjHtbRde2s5kzdf233sa
    rpcconnect=localhost
    rpcport=9796
    server=1

Save the file and then restart the wallet.


## 1.4 Starting the Explorer

Navigate to a directory where you want the `Energi Explorer` to be located and then run:

    git clone https://github.com/energicryptocurrency/explorer explorer

Then navigate to the newly created folder:

    cd explorer

...and run:

    npm install --production

Now copy and rename the settings template file

    cp ./settings.json.template ./settings.json

and open the newly created file, `settings.json` in a text editor. By modifying this file, you'll be able to customize the `Energi Explorer` to your liking. For now though, make sure that the wallet setting corresponds to the RCP settings you made in the conf file of the `Energi Core` wallet above.

Now, we can start the `Energi Explorer` by typing

    npm start

If you want to output the log and errors to separate text files, you can instead start `Energi Explorer` by typing:

    npm start > log.txt 2> errors.txt &


## 1.5 Starting the updating script

`sync.js` (located in `scripts/`) is used for updating the local database with information about the blockchain. This script must be called from the `Energi Explorer` root directory, so navigate there and then type:

    node scripts/sync.js index reindex

This will fetch information about the blockchain contained in your running `Energi Core` instance (make sure it's fully up to date with the network before running the scripts above) and put it in the database that `MongoDB` is managing.

You can, whenever you want, update the blockchain information by typing:

    node scripts/sync.js index update



For more detailed information about how to use `sync.js`, simply type:

    node scripts/sync.js

and if you run into problems, check out the "Known issues" section below.


### 1.5.1 Cron

It is recommended (but not necessary for testing/development) to have `sync.js` running via [cron](https://en.wikipedia.org/wiki/Cron) so that the information about the blockchain always is updated.

This is an example of the content of a [crontab](http://www.adminschoice.com/crontab-quick-reference) file that updates the index every minute and the market data every 2 minutes:

    */1 * * * * cd /path/to/explorer && /usr/bin/nodejs scripts/sync.js index update > /dev/null 2>&1
    */2 * * * * cd /path/to/explorer && /usr/bin/nodejs scripts/sync.js market > /dev/null 2>&1
    */5 * * * * cd /path/to/explorer && /usr/bin/nodejs scripts/peers.js > /dev/null 2>&1


## 1.6 Start using the application

In order to use the `Energi Explorer` which now is fully running, go to the address specified in the the `address` entry in the `settings.json` (defaults to `127.0.0.1:3001`) in your browser.


# 2. General


## 2.1 Cluster mode
As of version 1.4.0 the explorer defaults to cluster mode, forking an instance of its process to each cpu core. This results in increased performance and stability. Load balancing gets automatically taken care of and any instances that for some reason die, will be restarted automatically. For testing/development (or if you just wish to) a single instance can be launched with

    node --stack-size=10000 bin/instance

To stop the cluster you can use

    npm stop


## 2.2 Known Issues


### 2.2.1 sync.js


#### 2.2.1.1 Script is already running..

If you receive this message when launching the sync script either a) a sync is currently in progress, or b) a previous sync was killed before it completed. If you are certain a sync is not in progress, you can remove the index.pid from the `tmp/` folder in the `Energi Explorer` root directory.


#### 2.2.1.2 RangeError: Maximum call stack size exceeded

Nodes default stack size may be too small to index addresses with many tx's. If you experience the above error while running `sync.js`, the stack size needs to be increased.

To determine the default setting run:

    node --v8-options | grep -B0 -A1 stack_size

To run `sync.js` with a larger stack size launch with:

    node --stack-size=[SIZE] scripts/sync.js index update

where `[SIZE]` is an integer higher than the default.


# 3. License

Copyright (c) 2015, Iquidus Technology  
Copyright (c) 2015, Luke Williams  
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of Iquidus Technology nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
