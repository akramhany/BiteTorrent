import dgram from "dgram";
import bencode from "bencode";
import fs from 'fs/promises';
import { randomBytes, createHash } from "crypto";



const messageType = {
    connect: 0,
    announce: 1
};


class Client
{
    constructor()
    {
        this.connectionId = null;
        this.torrent = null;
        this.port = 6880;
        this.client = dgram.createSocket("udp4");
        this.client.bind(this.port);
        this.connnected = false;
        this.announced = false;
        this.beer_id = this.genId();
        this.client.on('message', this.onMessage.bind(this));
        this.client.on('error', console.error);
    }

    onMessage(msg, rinfo)
    {
        if(this.responseType(msg) === messageType.connect) {
            const res = this.parseResponse(msg);
            this.connectionId = res.connectionId;
            this.transactionId = res.transactionId;
            this.connnected = true;
        }
        else if(this.responseType(msg) === messageType.announce) {
            const res = this.parseAnnounceResponse(msg);
            this.peers = res.peers;
            this.announced = true;
        }
    }

    async init(torrentFile)
    {
        const data = await fs.readFile(torrentFile);
        this.torrent = bencode.decode(data, "utf8");
        const url = new URL(this.torrent['announce-list'][2]);
        this.port = url.port;
        this.hostname = url.hostname;
        this.info_hash = this.getInfoHash();
    }

    async tryConnect()
    {
        await this.sendAsync(this.constructConnectMessage(), this.port, this.hostname);
    }

    async tryAnnounce(){
        await this.sendAsync(this.constructAnnounceMessage(), this.port, this.hostname);
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

    getLeft(){
        return this.torrent.info.files.map((file) => {
            return file.length;
        }).reduce((a, b) => a + b);
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

    parseResponse(response) {
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
                    console.log("Message Sent Successfully");
                    resolve();
                }
            });
        });
    }

    genId(){
        return randomBytes(20);
    }

    getInfoHash(){
        const info = bencode.encode(this.torrent.info);
        return createHash("sha1").update(info).digest();
    }
    
};


function waitSecs(n){
    return new Promise((resolve) => {
        setTimeout(() => resolve(), n * 1000);
    })
}

async function main(){

    const client = new Client();

    await client.init("./resources/cosmos-laundromat.torrent");

    await client.tryConnect();

    while(!client.connnected)
    {
        await waitSecs(0.1);
    }

    console.log("Connected Successfully");

    await client.tryAnnounce();

    while(!client.announced)
    {
        await waitSecs(0.1)
    }

    console.log(client.beer_id);
    console.log(client.peers);



}


main();