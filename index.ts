import fs from 'node:fs';
import path from 'node:path';
import {EventEmitter} from "events";

import {Tree} from "@chainsafe/persistent-merkle-tree";

import {allForks, ssz} from "@lodestar/types";
import {
  BLOCK_BODY_EXECUTION_PAYLOAD_GINDEX,
  ForkExecution,
} from "@lodestar/params";

import {
  LightClientRestTransport,
} from '@lodestar/light-client/transport';
import { createChainForkConfig } from '@lodestar/config';
import {
  genesisData,
  networksChainConfig,
} from '@lodestar/config/networks';
import { getClient, FetchError } from "@lodestar/api";

import type { ChainConfig } from '@lodestar/config';
import type {
  GenesisData,
} from '@lodestar/light-client';

type NetworkName =
  "mainnet" |
  "sepolia";

interface IConf {
  chainConfig: ChainConfig,
  genesisData: GenesisData,
  BEACON_API: string;
  checkpointRoot: Uint8Array;
}

export function fromHexString(hex: string): Uint8Array {
  if (typeof hex !== "string") {
    throw new Error(`hex argument type ${typeof hex} must be of type string`);
  }

  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }

  if (hex.length % 2 !== 0) {
    throw new Error(`hex string length ${hex.length} must be multiple of 2`);
  }

  const byteLen = hex.length / 2;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    const byte = parseInt(hex.slice(i * 2, (i + 1) * 2), 16);
    bytes[i] = byte;
  }
  return bytes;
}

const wrappedFetch = async (
  url: string | URL,
  init?: RequestInit,
): Promise<Response> => {
  // console.log('fetch:', url);
  try {
    return await fetch(url, init);
  } catch (e) {
    throw new FetchError(url, e);
  }
};


const replacer = (
  key: string,
  value: unknown,
) => {
  if ( typeof value === "bigint" ) {
    return value.toString();
  }
  if ( value instanceof Uint8Array ) {
    return Buffer.from(value as Uint8Array).toString('hex');
  }

  return value;
};

const configs: Record<NetworkName, IConf> = {
  sepolia: {
    chainConfig: networksChainConfig.sepolia,
    genesisData: genesisData.sepolia,
    BEACON_API: 'https://lodestar-sepolia.chainsafe.io/',
    checkpointRoot: fromHexString(
      '0xa65f64e14b69bdce94e7cab1a6ce255003b205055c5d35752f38277c3fb80e39',
    ),
  },
  mainnet: {
    chainConfig: networksChainConfig.mainnet,
    genesisData: genesisData.mainnet,
    BEACON_API: 'http://testing.mainnet.beacon-api.nimbus.team/',
    checkpointRoot: fromHexString(
      '0xbd9f42d9a42d972bdaf4dee84e5b419dd432b52867258acb7bcc7f567b6e3af1',
    ),
  },
};

const confName: NetworkName = 'sepolia';
const conf = configs[confName];

console.log('NetworkName:', confName);


const pathDataDir = path.resolve('data');
if ( !fs.existsSync(pathDataDir) ) {
  fs.mkdirSync(pathDataDir);
}


class FinalityWatcher extends EventEmitter {
  public constructor(
    protected transport: LightClientRestTransport,
  ) {
    super();
  }

  public start() {
    this.run()
    .catch(ex => console.log(ex));
  }

  private _currentSlot = 0;
  private async run() {
    while ( true ) {
      const update = await this.transport.getFinalityUpdate();
      const { slot } = update.data.attestedHeader.beacon;

      if ( this._currentSlot !== slot ) {
        this._currentSlot = slot;
        this.emit('finality', update);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

const main = async () => {

  const {BEACON_API: baseUrl} = conf;
  const config = createChainForkConfig(conf.chainConfig);
  const api = getClient({ baseUrl, fetch: wrappedFetch }, { config });
  const transport = new LightClientRestTransport(api);

  const svcWatcher = new FinalityWatcher(transport);
  svcWatcher.on('finality', (update) => {
    const { slot } = update.data.attestedHeader.beacon;

    fs.promises.appendFile(
      path.join(pathDataDir, `${ slot }.finality.json`),
      JSON.stringify(update, replacer, 2),
      { 'flag': 'w' },
    )
    .then(() => console.log(slot))
    .catch(ex => console.log(ex));
  });

  svcWatcher.start();
}


main().catch(ex => console.log(ex));
