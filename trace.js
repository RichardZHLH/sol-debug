const fs = require('fs');
const path = require('path');
const net = require("net");
const optimist = require('optimist');
const Web3 = require('web3');

const prividerType = {
  http: "http"
  ,ipc: "ipc"
}
//node trace.js --type http --uri https://nodes-testnet.wandevs.org/wan
function parseScArgs() {
  let argv = optimist
  .usage("Usage: nodejs $0 --type [type] --uri [uri] --output[output] --txHash[txHash]")
  .alias('h', 'help')
  .describe('h', 'display the usage')
  .describe('type', `identify the provider type, should be "${prividerType.http}" or "${prividerType.ipc}"`)
  // such /Users/myuser/Library/Ethereum/geth.ipc for ipc
  .describe('uri', `identify uri path`)
  .describe('txHash', `identify the transaction hash to be parsed`)
  .describe('output', `identify the output file`)
  .default('type', prividerType.ipc)
  .default('output', path.join("txTrace.json"))
  .default('txHash', "0xbd0c4aecee47d0e8396d5ad1f8d66221c66520bbdefd7f779bc751ab13937db3")
  .string(["uri", "txHash", "output"])
  .demand(["uri", "txHash"])
  .argv;

  if (argv.help) {
    optimist.showHelp();
    process.exit(0);
  }
  return argv;
}

function insertMethod(web3, name, call, params, inputFormatter, outputFormatter) {
  return new web3.extend.Method({ name, call, params, inputFormatter, outputFormatter });
}

function getClient(type, uri) {
  let client;
  if (type === prividerType.ipc) {
    client = new Web3(new Web3.providers.IpcProvider(uri, net));
  } else {
    client = new Web3(new Web3.providers.HttpProvider(uri, {timeout:10000, keepAlive: false}));
  }
  console.log("type:", type, "uri:", uri);

  client.extend({
    property: 'debug',
    methods:
    [
      insertMethod(client, 'traceCall', 'debug_traceCall', 3, [null, null, null], null),
      insertMethod(client, 'traceTransaction', 'debug_traceTransaction', 2, [null, null], null),
    ],
    properties: [],
  });
  return client;
}

async function test() {
  const argv = parseScArgs();

  const client = getClient(argv.type, argv.uri);
  const result = await client.debug.traceTransaction(argv.txHash, {"tracer": "callTracer"});

  fs.writeFileSync(argv.output, JSON.stringify(result));
  console.log(`save trace tx about "${argv.txHash}" to "${argv.output}" success`);
}
test()
