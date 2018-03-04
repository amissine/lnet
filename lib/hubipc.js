/*
# Copyright 2017 Alec Missine (support@minetats.com) 
#                and the Arbitrage Logistics International (ALI) project
#
# The ALI Project licenses this file to you under the Apache License, version 2.0
# (the "License"); you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed
# under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
# CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#
# === hubipc.js ===
# The hub IPC agent, bridges all hubs on the localhost. Or, when {llp: -1} is
# passed, runs HubRegistrarServer on the localhost.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const net = require('net')
const fs  = require('fs')

module.exports = HubIPC

function HubIPC( options ) {
  const REGISTRAR = process.env.HOME+"/project/lnet/etc/ipc/" // the directory where all our UNIX domain sockets reside
  const REGFILE   = 'registrar.sock' // lock the registrar to add/remove a hub IPC server
  const id        = options.llp // this hub's id on the localhost (local port)
  const rf = REGISTRAR + REGFILE

  var connections = {},
    server, client, mode

  if (id == -1) {
    runHubRegistrarServer()
    return;
  }

  function runHubRegistrarServer() {
    console.log("runHubRegistrarServer starting")
    // check for failed cleanup
    console.log('Checking for leftover socket.');
    fs.stat(rf, function (err, stats) {
        if (err) {
            // start server
            console.log('No leftover socket found.');
            server = createServer(rf); return;
        }
        // remove file then start server
        console.log('Removing leftover socket.')
        fs.unlink(rf, function(err){
            if(err){
                // This should never happen.
                console.error(err); process.exit(0);
            }
            server = createServer(rf); return;
        });  
    });
    process.on('SIGINT', cleanup);
  }

    // close all connections when the user does CTRL-C
    function cleanup(){
        if(!SHUTDOWN){ SHUTDOWN = true;
            console.log('\n',"Terminating.",'\n');
            if(Object.keys(connections).length){
                let clients = Object.keys(connections);
                while(clients.length){
                    let client = clients.pop();
                    connections[client].write('__disconnect');
                    connections[client].end(); 
                }
            }
            server.close();
            process.exit(0);
        }
    }

  function createServer(socket){
    console.log('Creating server.');
    var server = net.createServer(function(stream) {
        console.log('Connection acknowledged.');

        // Store all connections so we can terminate them if the server closes.
        // An object is better than an array for these.
        var self = Date.now();
        connections[self] = (stream);
        stream.on('end', function() {
            console.log('Client disconnected.');
            delete connections[self];
        });

        // Messages are buffers. use toString
        stream.on('data', function(msg) {
            msg = msg.toString();
            if(msg === '__snootbooped'){
                console.log("Client's snoot confirmed booped.");
                return;
            }
            console.log('Client:', msg);
            if(msg === 'foo'){
                stream.write('bar');
            }
            if(msg === 'baz'){
                stream.write('qux');
            }
            if(msg === 'here come dat boi'){
                stream.write('Kill yourself.');
            }
        });
    })
    .listen(socket)
    .on('connection', function(socket){
        console.log('Client connected.');
        console.log('Sending boop.');
        socket.write('__boop');
        //console.log(Object.keys(socket));
    })
    ;
    return server;
}

  // Say hi to others, start listening for others
  acquireRegistrarLock().then(id => broadcast('Hi', id)).then(id => addHubServer(id))
  .then(() => releaseRegistrarLock())

  // Cleanup and bid farewell to others
  function close() {
    acquireRegistrarLock().then(() => remHubServer()).then(id => broadcast('Bye', id))
    .then(() => releaseRegistrarLock())
  }

  async function acquireRegistrarLock(){
    await registrarLock()
  }

  function registrarLock() {
    console.error("Connecting to HubRegistrarServer...");
    client = net.createConnection(rf)

    return new Promise((resolve, reject) => {
      client.on('connect', () => console.log("Connected to HubRegistrarServer."))
      .on('data', data => {
            data = data.toString(); // messages are buffers. use toString
            if(data === 'LOCK'){
                console.log('Lock acquired.')
                resolve(); return cleanup();
            }
            console.info('Server:', data) // generic message handler
        })
        .on('error', function(data) {
            console.error('Server not active.'); process.exit(1);
        })
    })
  }

    function cleanup(){
        if(!SHUTDOWN){ SHUTDOWN = true;
            console.log('\n',"Terminating.",'\n');
            client.end();
            process.exit(0);
        }
    }
}
/*
 * ACKNOWLEDGMENTS
 *
 * http://blog.trackets.com/2014/05/17/ssh-tunnel-local-and-remote-port-forwarding-explained-with-examples.html
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
 * https://gist.github.com/Xaekai/e1f711cb0ad865deafc11185641c632a
 * https://gist.github.com/martintajur/1640341
 * https://github.com/ORESoftware/live-mutex.git
 */
