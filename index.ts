import fs from 'node:fs';
import path from 'node:path';
import {EventEmitter} from "events";

// import StrictEventEmitter from "strict-event-emitter-types";

import {Tree} from "@chainsafe/persistent-merkle-tree";

// import {EPOCHS_PER_SYNC_COMMITTEE_PERIOD} from "@lodestar/params";
// import {
//   computeSyncPeriodAtEpoch,
//   // computeSyncPeriodAtSlot,
//   computeEpochAtSlot,
// } from "./lodestar/light-client/utils/clock.js";
import {allForks, ssz} from "@lodestar/types";
import {
  // FINALIZED_ROOT_GINDEX,
  BLOCK_BODY_EXECUTION_PAYLOAD_GINDEX,
  ForkExecution,
} from "@lodestar/params";

// import {
//   Lightclient,
//   LightclientEvent,
//   // LightClientRestTransport,
//   RunStatusCode,
// } from './light-client.ts';
// } from './lodestar/light-client/index.ts';
// } from '@lodestar/light-client';
import {
  LightClientRestTransport,
  // LightClientTransport,
} from '@lodestar/light-client/transport';
import { createChainForkConfig } from '@lodestar/config';
import {
  genesisData,
  networksChainConfig,
} from '@lodestar/config/networks';
import { getClient, FetchError } from "@lodestar/api";
// import {getNodeLogger} from "@lodestar/logger/node";
// import {allForks, altair, phase0, Root, ssz} from "@lodestar/types";
// import {
//   // getNextSyncCommitteeBranch,
//   // getSyncCommitteesWitness,
//   // getFinalizedRootProof,
//   // getCurrentSyncCommitteeBranch,
//   getBlockBodyExecutionHeaderProof,
// } from "@lodestar/beacon-node";

import type { ChainConfig } from '@lodestar/config';
import type {
  GenesisData,
  // LightclientEvent,
  // LightclientInitArgs,
  // GenesisData,
} from '@lodestar/light-client';
// import type {LoggerNodeOpts} from "@lodestar/logger/node";

/*
export enum RunStatusCode {
  uninitialized,
  started,
  syncing,
  stopped,
}
*/
// export const RunStatusCodeName = [
//   'uninitialized',
//   'started',
//   'syncing',
//   'stopped',
// ];

type NetworkName =
  "mainnet" |
  // "gnosis" |
  // "goerli" |
  // "ropsten" |
  // "chiado" |
  "sepolia";

interface IConf {
  chainConfig: ChainConfig,
  genesisData: GenesisData,
  BEACON_API: string;
  checkpointRoot: Uint8Array; // string;
}

type TBeaconBlockBody = allForks.AllForksExecutionSSZTypes["BeaconBlockBody"];

// export
function getBlockBodyExecutionHeaderProof(
  fork: ForkExecution,
  body: allForks.AllForksExecution["BeaconBlockBody"],
): Uint8Array[] {
  const bodyView = (
    ssz[fork].BeaconBlockBody as TBeaconBlockBody
  ).toView(body);
  return new Tree(bodyView.node).getSingleProof(
    BigInt(BLOCK_BODY_EXECUTION_PAYLOAD_GINDEX),
  );
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

// const logger = {
//   error: console.error,
//   warn: console.warn,
//   info: console.log,
//   debug: console.log,
//   // debug: () => {},
// };

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
    // return value.toString() + "n";
    return value.toString();
  }
  if ( value instanceof Uint8Array ) {
    return Buffer.from(value as Uint8Array).toString('hex');
  }

  return value;
};


/*
export const defaultNetworkUrls: Record<NetworkName, {beaconApiUrl: string; elRpcUrl: string}> = {
  [NetworkName.mainnet]: {
    beaconApiUrl: process.env.REACT_APP_MAINNET_BEACON_API ||
    "https://lodestar-mainnet.chainsafe.io",
    elRpcUrl: process.env.REACT_APP_MAINNET_EXECUTION_API ||
    "https://lodestar-mainnetrpc.chainsafe.io",
  },
  [NetworkName.goerli]: {
    beaconApiUrl: process.env.REACT_APP_PRATER_BEACON_API ||
    "https://lodestar-goerli.chainsafe.io",
    elRpcUrl: process.env.REACT_APP_PRATER_EXECUTION_API ||
    "https://lodestar-goerlirpc.chainsafe.io",
  },
  [NetworkName.sepolia]: {
    beaconApiUrl: process.env.REACT_APP_SEPOLIA_BEACON_API ||
    "https://lodestar-sepolia.chainsafe.io",
    elRpcUrl: process.env.REACT_APP_SEPOLIA_EXECUTION_API ||
    "https://lodestar-sepoliarpc.chainsafe.io",
  },
  [NetworkName.custom]: {beaconApiUrl: "", elRpcUrl: ""},
};
*/
const configs: Record<NetworkName, IConf> = {
  sepolia: {
    chainConfig: networksChainConfig.sepolia,
    genesisData: genesisData.sepolia,
    // BEACON_API: 'http://159.223.222.96:5053/', // /eth/v1/
    BEACON_API: 'https://lodestar-sepolia.chainsafe.io/', // /eth/v1/
    checkpointRoot: fromHexString(
      '0xa65f64e14b69bdce94e7cab1a6ce255003b205055c5d35752f38277c3fb80e39',
    ),
  },
  mainnet: {
    chainConfig: networksChainConfig.mainnet,
    genesisData: genesisData.mainnet,
    BEACON_API: 'http://testing.mainnet.beacon-api.nimbus.team/', // /eth/v1/
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

// export enum EventType {
//   lightClientFinalityUpdate = "light_client_finality_update",
// }

// export type LightClientRestEvents = {
//   [EventType.lightClientFinalityUpdate]: allForks.LightClientFinalityUpdate;
// };

// type RestEvents = StrictEventEmitter<EventEmitter, LightClientRestEvents>;


class FinalityWatcher
  extends EventEmitter
  // extends (EventEmitter as { new (): RestEvents })
  // extends (EventEmitter as { new (): StrictEventEmitter<EventEmitter, LightClientRestEvents> })
  // implements LightClientTranspor
{
  public constructor(
    protected transport: LightClientRestTransport, // LightClientTransport,
  ) {
    //
    super();
  }

  public start() {
    this.run().catch(ex => console.log(ex));
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

  // // transport.fetchBlock()
  // const f = await transport.getFinalityUpdate();
  // let slot = f.data.attestedHeader.beacon.slot;

/*
  while ( true ) {
    const currentEpoch = computeEpochAtSlot(slot);
    // const epochsIntoPeriod = currentEpoch % EPOCHS_PER_SYNC_COMMITTEE_PERIOD;
    // Start fetching updates with some lookahead
    // if (EPOCHS_PER_SYNC_COMMITTEE_PERIOD - epochsIntoPeriod <= LOOKAHEAD_EPOCHS_COMMITTEE_SYNC) {
    const period = computeSyncPeriodAtEpoch(currentEpoch);
    // console.log(period);
    const updates = await transport.getUpdates(period, 1);

    if ( slot !== updates[0].data.attestedHeader.beacon.slot ) {
      slot = updates[0].data.attestedHeader.beacon.slot;
      console.log(period, currentEpoch, slot, updates[0].data.finalizedHeader.beacon.slot);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
*/
  // console.log(JSON.stringify(updates[0], replacer, 2));
/*
  while ( true ) {
    try {
      const [
        update,
        finality,
      ] = await Promise.all([
        transport.getOptimisticUpdate(),
        transport.getFinalityUpdate(),
      ]);
      // const update = await transport.getOptimisticUpdate();
      // const finality = await transport.getFinalityUpdate();
      // this.processOptimisticUpdate(update.data);
      // if ( slot !== update.data.attestedHeader.beacon.slot ) {
      if ( slot !== update.data.attestedHeader.beacon.slot ) {
        console.log(
          slot,
          update.data.attestedHeader.beacon.slot,
          update.data.signatureSlot,
          finality.data.attestedHeader.beacon.slot,
          ( (update.data.attestedHeader.beacon.slot - slot > 1)
            || (update.data.signatureSlot - update.data.attestedHeader.beacon.slot > 1)
          ) ? '!' : '',
        );

        fs.promises.appendFile(
          path.join(pathDataDir, `${ update.data.attestedHeader.beacon.slot }.json`),
          JSON.stringify(update, replacer, 2),
          { 'flag': 'w' },
        ).catch(ex => console.log(ex));

        const b = await transport.fetchBlock(update.data.attestedHeader.beacon.slot.toString());

        const strArrExecutionProof = getBlockBodyExecutionHeaderProof(
          b.version as ForkExecution,
          b.data.message.body as allForks.AllForksExecution["BeaconBlockBody"], // as TBeaconBlockBody,
        ).map(
          (a) => Buffer.from(a).toString('hex'),
        );

        console.log(strArrExecutionProof);

        slot = update.data.attestedHeader.beacon.slot;
      }

      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      logger.error("Error fetching getLatestHeadUpdate", e as Error);
    }
  }
*/
}
/*
const main2 = async () => {
  const {BEACON_API: baseUrl, checkpointRoot, genesisData} = conf;
  const config = createChainForkConfig(conf.chainConfig);
  const api = getClient({ baseUrl, fetch: wrappedFetch }, { config });
  const transport = new LightClientRestTransport(api);

  const client = await Lightclient.initializeFromCheckpointRoot({
    config,
    logger,
    genesisData,
    checkpointRoot,
    transport,
    // opts: {
    //   allowForcedUpdates: true, // ?: boolean;
    //   updateHeadersOnForcedUpdate: true, // ?: boolean;
    // }
  });


  client.emitter.on(LightclientEvent.lightClientFinalityHeader, (header) => {
    console.log('! beacon.slot:', header.beacon.slot);
    fs.promises.appendFile(
      path.resolve('data', `${ header.beacon.slot }.fin.json`),
      JSON.stringify(header, replacer, 2),
    )
    .catch(ex => console.log(ex))
  });
  client.emitter.on(LightclientEvent.lightClientOptimisticHeader, (header) => {
    console.log('? beacon.slot:', header.beacon.slot);
    fs.promises.appendFile(
      path.resolve('data', `${ header.beacon.slot }.opt.json`),
      JSON.stringify(header, replacer, 2),
    )
    .catch(ex => console.log(ex))
  });
  client.emitter.on(LightclientEvent.statusChange, (code: RunStatusCode) => {
    console.log(`#${ code } (${ RunStatusCodeName[code] })`);
  });


  client.start();
}
*/
main().catch(ex => console.log(ex));
