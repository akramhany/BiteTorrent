import dgram from "dgram";
import { randomBytes } from "crypto";


const messageType = {
    connect: 0,
    announce: 1
};

class TrackerClient
{
    constructor(port, trackerHost, trackerPort, beer_id, info_hash){
        this.connectionId = null;
        this.connected = false;
        this.announced = false;
        this.port = port;
        this.client = this.initClient(port);
        this.host = trackerHost;
        this.tport = trackerPort;
        this.beer_id = beer_id;
        this.info_hash = info_hash;
    }

    initClient(port){

        const socket = dgram.createSocket("udp4");
        socket.bind(port);
        socket.on('message', this.onMessage.bind(this));
        socket.on('error', console.error);

        return socket;
    }

    async close(){
        await this.client.close();
    }

    onMessage(msg, rinfo)
    {
        if(this.responseType(msg) === messageType.connect) {
            const res = this.parseConnectResponse(msg);
            this.connectionId = res.connectionId;
            this.connected = true;
        }

        else if(this.responseType(msg) === messageType.announce) {
            const res = this.parseAnnounceResponse(msg);
            this.peers = res.peers;
            this.announced = true;
        }
    }

    async tryConnect()
    {
        await this.sendAsync(this.constructConnectMessage(), this.tport, this.hostname);
    }

    async tryAnnounce(){
        await this.sendAsync(this.constructAnnounceMessage(), this.tport, this.hostname);
    }

    constructConnectMessage(){
        const buffer = Buffer.alloc(16);

        buffer.writeBigUInt64BE(0x41727101980n, 0);
        buffer.writeUInt32BE(messageType.connect, 8);
        randomBytes(4).copy(buffer, 12);
    
        return buffer;
    }

    constructAnnounceMessage()
    {
        const buffer = Buffer.alloc(98);

        buffer.writeBigUInt64BE(this.connectionId, 0); //connection id
        buffer.writeUInt32BE(messageType.announce, 8); //action
        randomBytes(4).copy(buffer, 12); //transaction id
        this.info_hash.copy(buffer, 16); //info hash
        this.beer_id.copy(buffer, 36); //peer id
        buffer.writeBigUint64BE(0n, 56); //downloaded
        buffer.writeBigUint64BE(BigInt(this.getLeft()), 64); //left
        buffer.writeBigUint64BE(0n, 72); //uploaded
        buffer.writeUInt32BE(0, 80); //event
        buffer.writeUInt32BE(0, 84); //ip address
        buffer.writeUInt32BE(0, 88); //key
        buffer.writeInt32BE(-1, 92); //num want
        buffer.writeUInt16BE(this.port, 96); //PORT

        return buffer;
    }

    responseType(response) {
        return response.readUInt32BE(0);
    }

    parseAnnounceResponse(response) {

        const action = response.readUInt32BE(0);
        const transactionId = response.readUInt32BE(4);
        const interval = response.readUInt32BE(8);
        const leechers = response.readUInt32BE(12);
        const seeders = response.readUInt32BE(16);
        const peers = [];

        for(let i = 20; i < response.length; i += 6)
        {
            let ip = response.readUInt32BE(i);
            let port = response.readUInt16BE(i + 4);

            peers.push({ip, port});
        }

        return {
            action,
            transactionId,
            interval,
            leechers,
            seeders,
            peers
        };
    }

    parseConnectResponse(response) {
        const action = response.readUInt32BE(0);
        const transactionId = response.readUInt32BE(4);
        const connectionId = response.readBigUInt64BE(8);
    
        return {
            action,
            transactionId,
            connectionId
        };
    }

    async sendAsync(msg, port, hostname) {
        return new Promise((resolve, reject) => {
            this.client.send(msg, port, hostname, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}


export default TrackerClient;