import BaseConsensus from "./consensus-base";

const {client} = global.blockchain.sockets.client;
const {BasicSocket} = global.blockchain.sockets.basic;

const {NodeConsensusTypeEnum} = global.blockchain.sockets.schemas.types;
const {BigNumber} = global.blockchain.utils;
const {MarshalData} = global.protocol.marshal;

class Consensus extends BaseConsensus{

    constructor(settings) {

        super(settings);

        this._settings.address = "http://127.0.0.1:4006";

        this._data = {

            start: 0,
            end: 0,
            hash: Buffer.alloc(32),
            kernelHash: Buffer.alloc(32),
            prevHash: Buffer.alloc(32),
            prevKernelHash: Buffer.alloc(32),
            chainwork: BigNumber(0),

            blocks: {

            },

            transactions : {

            },

        };

    }

    async _started(){

        console.log( {

            maxHttpBufferSize: global.apacache._scope.argv.networkSettings.networkMaxSize,
            query: {
                handshake: JSON.stringify({
                    short: global.apacache._scope.argv.settings.applicationShort,

                    build: global.apacache._scope.argv.settings.buildVersion,

                    net: {
                        type: global.apacache._scope.argv.settings.networkType,
                    },

                    address: '',
                    consensus: NodeConsensusTypeEnum.CONSENSUS_RPC
                })
            }
        } );

        const sock = client( this._settings.address, {

            maxHttpBufferSize: global.apacache._scope.argv.networkSettings.networkMaxSize,
            query: {
                handshake: JSON.stringify({
                    short: global.apacache._scope.argv.settings.applicationShort,

                    build: global.apacache._scope.argv.settings.buildVersion,

                    net: {
                        type: global.apacache._scope.argv.settings.networkType,
                    },

                    address: '',
                    consensus: NodeConsensusTypeEnum.CONSENSUS_RPC
                })
            }
        });

        this._client = new BasicSocket( global.apacache._scope, this._settings.address, sock, undefined );

        [ "connect", "on","once", "disconnect", "emit" ].map( fct => this._client[fct] = this._client._socket[fct].bind(this._client._socket) );

        this._client.on("connect", ()=> this.status = "online" );
        this._client.on("disconnect", ()=> this.status = "offline" );

        this._client.once("handshake", handshake =>{

            console.log("handshake.short", handshake.short);

            if (handshake.short === global.apacache._scope.argv.settings.applicationShort) {
                this.status = "syncing";
                this._client.emit("ready!", "go!");
            }
            else
                this._client.close();
        });

        this._client.on("blockchain-protocol/new-block", this._processBlockchainNewBlock.bind(this) );

        this._client.on("connect", ()=>{

            this._client.emit("blockchain/get-info", undefined, this._processBlockchain.bind(this) );

        })

    }

    async _processBlockchainNewBlock(data) {

        await this._processBlockchainInfo(data);

    }

    async _processBlockchain(data){

        await this._processBlockchainInfo(data);

        this.status = "sync";

    }

    async _processBlockchainInfo(data){

        this._data.end = data.blocks;
        this._data.start = data.start;
        this._data.hash = data.hash;
        this._data.prevHash = data.prevHash;
        this._data.prevKernelHash = data.prevKernelHash;
        this._data.chainwork = MarshalData.decompressBigNumber( data.chainwork );

        return this._downloadLastBlocks();

    }

    async _downloadLastBlocks(){

        const starting = this.starting;
        const ending =  this.ending-1;

        let done = false;
        for (let i = ending; i >= starting && !done; i-- ){

            const blockHash = await this._client.emitAsync("blockchain/get-block-hash", { index: i } );

            if (!this._data.blocks[i] || this._data.blocks[i].hash().equals(blockHash)) {

                const blockData = await this._client.emitAsync("blockchain/get-block-by-height", {index: i, type: "json"}  );

                this._data.blocks[i] = blockData;

            } else {

                if (this._data.blocks[i].hash().equals(blockHash) )
                    return true;

            }

        }

        return true;

    }

    async _stopped(){

        // if (this._scope.masterCluster)
        //     await this._scope.masterCluster.close();

    }

    async getBlocksDetails(startingHeight, endingHeight){

    }

    async getBlock(height){

        if (this._data.blocks[height])
            return this._data.blocks[height];

        if (height >= this._data.end) return;

        const blockData = await this._client.emitAsync("blockchain/get-block-by-height", {index: i, type: "buffer"}  );

        this._data.blocks[height] = blockData ;

        return blockData;

    }

    async getBlockTransactions(height){

    }

    async getTransaction(txId){

    }


    get starting(){
        return this._starting || this._data.end - 30;
    }

    get ending(){
        return this._ending || this._data.end;
    }

}

export default new Consensus({});