import dgram from "dgram";
import bencode from "bencode";
import fs from 'fs/promises';
import { randomBytes, createHash } from "crypto";
import TrackerClient from "./TrackerClient.js";




class Client
{
    constructor()
    {
        this.torrent = null;
        this.announceList = null;
        this.port = 6881;
        this.tClient = null;
        this.beer_id = this.genId();
        this.peers = null;
    }

    async init(torrentFile)
    {
        const data = await fs.readFile(torrentFile);
        this.torrent = bencode.decode(data, "utf8");
        this.info_hash = this.getInfoHash();
        this.announceList = this.torrent['announce-list'];
    }

    async trackerConnect()
    {
        for(let i = 0; i < this.announceList.length; i++)
        {
            const url = new URL(this.announceList[i]);

            if(!url.port || !url.hostname)
                continue;

            this.tClient = new TrackerClient(this.port, url.hostname, url.port, this.peer_id, this.info_hash);

            console.log(`trying to connect to ${url.hostname} on ${url.port}`);
            await this.tClient.tryConnect();

            await waitSecs(10);

            if(!this.tClient.connected)
            {
                await this.tClient.close();
                this.tClient = null;
                continue;
            }

            await this.tClient.tryAnnounce();

            await waitSecs(10);

            if(!this.tClient.announced)
            {
                await this.tClient.close();
                this.tClient = null;
                continue;
            }

            break;
        }

        if(!this.tClient){
            throw Error("Couldn't Connect To a Tracker");
        }

        this.peers = this.tClient.peers;
    }

    getLeft(){
        return this.torrent.info.files.map((file) => {
            return file.length;
        }).reduce((a, b) => a + b);
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

    await client.init('./resources/big-buck-bunny.torrent');

    await client.trackerConnect();

    console.log(client.peers);


}


main();