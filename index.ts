import fs from 'node:fs';
import path from 'node:path';
import {EventEmitter} from "events";

import blst from "@chainsafe/blst";
// import StrictEventEmitter from "strict-event-emitter-types";

import {Tree} from "@chainsafe/persistent-merkle-tree";

import {
  EPOCHS_PER_SYNC_COMMITTEE_PERIOD,
  SLOTS_PER_EPOCH,
} from "@lodestar/params";
// import {
//   computeSyncPeriodAtEpoch,
//   // computeSyncPeriodAtSlot,
//   computeEpochAtSlot,
// } from "./lodestar/light-client/utils/clock.js";
import {
  allForks,
  ssz,
  Epoch,
  Slot,
  SyncPeriod,
} from "@lodestar/types";
import {
  // FINALIZED_ROOT_GINDEX,
  BLOCK_BODY_EXECUTION_PAYLOAD_GINDEX,
  ForkName,
  ForkSeq,
  ForkExecution,
} from "@lodestar/params";
// import {MIN_SYNC_COMMITTEE_PARTICIPANTS, SYNC_COMMITTEE_SIZE, ForkName, ForkSeq, ForkExecution} from "@lodestar/params";

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
// import { createChainForkConfig } from '@lodestar/chain';
import { createChainForkConfig } from '@lodestar/config';
import { executionPayloadToPayloadHeader } from '@lodestar/state-transition';
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
import type {
  // ssz,
  ContainerType,
} from '@chainsafe/ssz';
// import { ContainerType, BitVectorType } from '@chainsafe/ssz';
import type {
  altair,
  phase0,
  capella,
} from '@lodestar/types';

// import type {LoggerNodeOpts} from "@lodestar/logger/node";


export function computeEpochAtSlot(slot: Slot): Epoch {
  return Math.floor(slot / SLOTS_PER_EPOCH);
  // return Math.round((slot + 0.5) / SLOTS_PER_EPOCH);
}

export function computeSyncPeriodAtSlot(slot: Slot): SyncPeriod {
  return computeSyncPeriodAtEpoch(computeEpochAtSlot(slot));
}

export function computeSyncPeriodAtEpoch(epoch: Epoch): SyncPeriod {
  return Math.floor(epoch / EPOCHS_PER_SYNC_COMMITTEE_PERIOD);
}


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


const rewriteFile = async (fileName: string, data: string) =>
  fs.promises.appendFile(fileName, data, { 'flag': 'w' })
;

const formatJSON = (data: object) => JSON.stringify(data, replacer, 2);

class LocalFolder extends EventEmitter {
  public constructor(
    private _name: string,
    private _parent: string, // | LocalFolder,
  ) {
    super();
  }

  public get name(): string {
    return this._name;
  }
  public get parentPath(): string {
    return this._parent;
  }
  public get fullName(): string {
    return path.join(this.parentPath, this.name);
  }

  public ensure() {
    const { fullName, name } = this;
    if ( !fs.existsSync(fullName) ) {
      // console.log('create:', name, fullName);
      fs.mkdirSync(fullName);
      this.emit('create', name);
    }

    return this;
  };
}

class LocalStorageFolder extends LocalFolder {
  protected constructor(name: string, parent: LocalFolder | string) {
    super(name, parent instanceof LocalFolder ? parent.fullName : parent);
  }

  public create(name: string): LocalStorageFolder {
    const fld = new LocalStorageFolder(name, this);
    fld.once('create', (...args) => {
      this.emit('child:create', ...args);
    });
    return fld.ensure();
  }
}

class LocalStorageRootFolder extends LocalStorageFolder {

  public static create(name: string, parentPath: string): LocalStorageRootFolder {
    return (new LocalStorageRootFolder(name, parentPath)).ensure();
  };

  protected constructor(name: string, parentPath: string) {
    super(name, parentPath);
  }
}

type TFinalityUpdate = {
  version: ForkName;
  data: allForks.LightClientFinalityUpdate
};

type TOptimisticUpdate = {
  version: ForkName;
  data: allForks.LightClientOptimisticUpdate
};

class JSONLocalStorage extends EventEmitter {
  public constructor(
    private _dataDir: LocalStorageRootFolder,
  ) {
    super();
    _dataDir.on('child:create', this.onFolderCreated.bind(this));
  }

  protected onFolderCreated(name: string) {
    // console.log('onFolderCreated:', name);
    this.emit('period:open', +name);
  }

  public addSyncComiteeUpdate(update: {
    version: ForkName;
    data: allForks.LightClientUpdate;
  }) {
    const { slot } = update.data.finalizedHeader.beacon;
    const epoch = computeEpochAtSlot(slot);
    const period = computeSyncPeriodAtEpoch(epoch);
    const fn = path.join(
      this._dataDir.create(`${ period + 1 }`).fullName,
      'update.json',
    );
    return rewriteFile(fn, formatJSON(update));
  }

  public addFinalityUpdate(update: TFinalityUpdate) {
    const { slot } = update.data.finalizedHeader.beacon;
    const fn = this.buildFullFileName(slot, `${ slot }.finality.json`);
    return rewriteFile(fn, formatJSON(update));
  }

  public addOptimisticUpdate(update: TOptimisticUpdate) {
    const { slot } = update.data.attestedHeader.beacon;
    const fn = this.buildFullFileName(slot, `${ slot }.optimistic.json`);
    return rewriteFile(fn, formatJSON(update));
  }

  public addOptimisticUpdateFake(update: TOptimisticUpdate) {
    const { slot } = update.data.attestedHeader.beacon;
    const fn = this.buildFullFileName(slot, `${ slot }.fake.json`);
    return rewriteFile(fn, formatJSON(update));
  }

  protected buildFullFileName(
    slot: number,
    fileName: string,
  ) {
    const epoch = computeEpochAtSlot(slot);
    const period = computeSyncPeriodAtEpoch(epoch);
    return path.join(
      this._dataDir.create(`${ period }`).create(`${ epoch }`).fullName,
      fileName,
    );
  }
}

class OptimisticWatcher
  extends EventEmitter
  // extends (EventEmitter as { new (): RestEvents })
  // extends (EventEmitter as { new (): StrictEventEmitter<EventEmitter, LightClientRestEvents> })
  // implements LightClientTranspor
{
  public constructor(
    protected transport: LightClientRestTransport, // LightClientTransport,
  ) {
    super();
  }

  public start() {
    this.run().catch(ex => console.log(ex));
  }

  private _currentSlot = 0;
  private async run() {
    while ( true ) {
      const update = await this.transport.getOptimisticUpdate();
      const { slot } = update.data.attestedHeader.beacon;

      if ( this._currentSlot !== slot ) {
        this._currentSlot = slot;
        this.emit('optimistic', update);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

class FinalityWatcher
  extends EventEmitter
  // extends (EventEmitter as { new (): RestEvents })
  // extends (EventEmitter as { new (): StrictEventEmitter<EventEmitter, LightClientRestEvents> })
  // implements LightClientTranspor
{
  public constructor(
    protected transport: LightClientRestTransport, // LightClientTransport,
  ) {
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


export function blockToLightClientHeader(
  fork: ForkName,
  block: allForks.AllForksLightClient["BeaconBlock"]
): allForks.LightClientHeader {
  const blockSlot = block.slot;
  const beacon: phase0.BeaconBlockHeader = {
    slot: blockSlot,
    proposerIndex: block.proposerIndex,
    parentRoot: block.parentRoot,
    stateRoot: block.stateRoot,
    bodyRoot: (ssz[fork].BeaconBlockBody as allForks.AllForksLightClientSSZTypes["BeaconBlockBody"]).hashTreeRoot(
      block.body
    ),
  };
  if (ForkSeq[fork] >= ForkSeq.capella) {
    const blockBody = block.body as allForks.AllForksExecution["BeaconBlockBody"];
    const execution = executionPayloadToPayloadHeader(ForkSeq[fork], blockBody.executionPayload);
    return {
      beacon,
      execution,
      executionBranch: getBlockBodyExecutionHeaderProof(fork as ForkExecution, blockBody),
    } as allForks.LightClientHeader;
  } else {
    return {beacon};
  }
}

const main = async () => {
  // const storage = new JSONLocalStorage(pathDataDir);
  const storage = new JSONLocalStorage(
    LocalStorageRootFolder.create('data', '.'),
  );

  type TCapellaBlock = {
    version: ForkName;
    data: capella.SignedBeaconBlock;
  };
  const buildOptimistic = async (id: string) => {
    const block = await transport.fetchBlock(id) as TCapellaBlock;

    const update = {
      attestedHeader: blockToLightClientHeader(
        ForkName.capella,
        block.data.message,
      ),
    } as capella.LightClientOptimisticUpdate;

    storage.addOptimisticUpdateFake({
      version: ForkName.capella, // 'capella',
      data: update,
    })
    .then(() => console.log('FKE', block.data.message.slot))
    .catch(ex => console.log(ex));
  };

  const onOptimisticUpdate = (update: TOptimisticUpdate) => {
    const { slot } = update.data.attestedHeader.beacon;

    storage.addOptimisticUpdate(update)
    .then(() => console.log('OPT', slot))
    .catch(ex => console.log(ex));
  };

  const DOMAIN_SYNC_COMMITTEE = Uint8Array.from([7, 0, 0, 0]);
  const CAPELLA_FORK_VERSION = fromHexString("0x90000072"); // sepolia
  // curl -X 'GET' 'http://${ hostWithPort }/eth/v1/beacon/genesis' \
  //   -H 'accept: application/json'
  const jsonGenesis = { data: {
    genesis_time: 1655733600,
    genesis_validators_root:
      '0xd8ea171f3c94aea21ebc42a1ed61052acf3f9209c00e4efbaaddac09ed9b8078',
    genesis_fork_version: '0x90000069',
  }};

  function getBit(
    n: number,
    bytearray: Uint8Array,
  ): Boolean {
    const idxByte = Math.floor(n / 8);
    const idxBit = 1 << (n % 8);
    return !!(idxBit & bytearray[idxByte]);
  }

  const verifySignature = (
    update: allForks.LightClientFinalityUpdate,
    syncCommittee: altair.SyncCommittee,
  ) => {
    const participantPubkeys: blst.PublicKey[] = [];
    const {
      bitLen,
      uint8Array,
    } = update.syncAggregate.syncCommitteeBits;
    for(let i = 0; i < bitLen; i++) {
      if ( getBit(i, uint8Array) ) {
        participantPubkeys.push(
          blst.PublicKey.fromBytes(
            syncCommittee.pubkeys[i],
          ),
        );
      }
    }

    const genesis = ssz.phase0.Genesis.fromJson(jsonGenesis.data);

    // computeDomain
    const forkDataRoot = ssz.phase0.ForkData.hashTreeRoot({
      currentVersion: CAPELLA_FORK_VERSION,
      genesisValidatorsRoot: genesis.genesisValidatorsRoot,
    });
    const domain = new Uint8Array(32);
    domain.set(DOMAIN_SYNC_COMMITTEE, 0);
    domain.set(forkDataRoot.slice(0, 28), 4);

    const objectRoot = ssz.phase0.BeaconBlockHeader.hashTreeRoot(
      update.attestedHeader.beacon
    );
    const signingRoot = ssz.phase0.SigningData.hashTreeRoot({
      objectRoot,
      domain,
    });

    const aggPubkey = blst.aggregatePubkeys(participantPubkeys);
    const sig = blst.Signature.fromBytes(
      update.syncAggregate.syncCommitteeSignature
    );

    const res = blst.verify(signingRoot, aggPubkey, sig);
    console.log(res);
  };

  const onFinalityUpdate = (update: TFinalityUpdate) => {
    // onOptimisticUpdate(extractOptimistic(update));
    const { slot, parentRoot } = update.data.finalizedHeader.beacon;

    // !!!
    // verifySignature

    storage.addFinalityUpdate(update)
    .then(() => console.log('FIN', slot))
    .catch(ex => console.log(ex));

    const formatHash = (hash: Uint8Array): string => {
      const strHashHEX = Buffer.from(hash).toString('hex');
      return `0x${ strHashHEX }`;
    };
    buildOptimistic(formatHash(parentRoot));
  };

  const {BEACON_API: baseUrl} = conf;
  const config = createChainForkConfig(conf.chainConfig);
  const api = getClient({ baseUrl, fetch: wrappedFetch }, { config });
  const transport = new LightClientRestTransport(api);

  const fetchSyncComitee = async (newPeriod: number) => {
    console.log('fetchSyncComitee for:', newPeriod);
    const updates = await transport.getUpdates(newPeriod - 1, 1);
    const { slot } = updates[0].data.finalizedHeader.beacon;

    storage.addSyncComiteeUpdate(updates[0]).catch(ex => console.log(ex));

    const epoch = computeEpochAtSlot(slot);
    const period = computeSyncPeriodAtEpoch(epoch);
    console.log(newPeriod, period, epoch, slot);
  };
  storage.on('period:open', (period: number) => {
    console.log('period:open', period);
    fetchSyncComitee(period).catch(ex => console.log(ex));
  });

  const svcWatcher = new FinalityWatcher(transport);

  svcWatcher.on('finality', onFinalityUpdate);
  svcWatcher.start();

  const svcOptimisticWatcher = new OptimisticWatcher(transport);
  svcOptimisticWatcher.on('optimistic', onOptimisticUpdate);
  svcOptimisticWatcher.start();

}


main().catch(ex => console.log(ex));
