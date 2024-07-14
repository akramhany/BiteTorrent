import buffer from "buffer";

const Buffer = buffer.Buffer;

export default class MessageBuilder {
  //<pstrlen><pstr><reserved><info_hash><peer_id>
  buildHandShake(torrent) {
    const buf = Buffer.alloc(68);

    const protocol = "BitTorrent protocol";

    //write the length of the protocol name
    buf.writeUInt8(protocol.length, 0);

    //write the protocol name
    buf.write(protocol, 1);

    //reserved 8 bytes
    buf.writeUInt32BE(0, 20);
    buf.writeUInt32BE(0, 24);

    //TODO: Write the info_hash and the peer_id (each is 20 bytes)
  }

  buildKeepAlive() {
    //Contains no message id, and no payload
    return Buffer.alloc(4);
  }

  //<len=0001><id=0><no payload>
  buildChoke() {
    const buf = Buffer.alloc(5);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUInt32BE(1, 0);

    //1 byte for the id of the message
    buf.writeUInt8(0, 4);

    return buf;
  }

  //<len=0001><id=1><no payload>
  buildUnchoke() {
    const buf = Buffer.alloc(5);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUInt32BE(1, 0);

    //1 byte for the id of the message
    buf.writeUInt8(1, 4);

    return buf;
  }

  //<len=0001><id=2><no payload>
  buildInterested() {
    const buf = Buffer.alloc(5);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUInt32BE(1, 0);

    //1 byte for the id of the message
    buf.writeUInt8(2, 4);

    return buf;
  }

  //<len=0001><id=3><no payload>
  buildNotInterested() {
    const buf = Buffer.alloc(5);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUInt32BE(1, 0);

    //1 byte for the id of the message
    buf.writeUInt8(3, 4);

    return buf;
  }

  //<len=0005><id=4><payload=piece_index>
  buildHave(payload) {
    const buf = Buffer.alloc(9);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUInt32BE(5, 0);

    //1 byte for the id of the message
    buf.writeUInt8(4, 4);

    //the actual message that is sent
    buf.writeUint32BE(payload, 5);

    return buf;
  }

  //<len=0001+X><id=5><payload=bitfield>
  buildBitfield() {
    //TODO
  }

  //<len=00013><id=6><index><begin><length>
  buildRequest(payload) {
    const buf = Buffer.alloc(17);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUint32BE(13, 0);

    //1 byte for the id of the message
    buf.writeUInt8(6, 4);

    //index
    buf.writeUint32BE(payload.index, 5);

    //begin
    buf.writeUint32BE(payload.begin, 9);

    //length
    buf.writeUint32BE(payload.length, 13);

    return buf;
  }

  //<len=0009+X><id=7><index><begin><block>
  buildPiece(payload) {
    const buf = Buffer.alloc(payload.block.length + 13);

    //length of the message
    buf.writeUInt32BE(payload.block.length + 9, 0);

    //id
    buf.writeUInt8(7, 4);

    //index
    buf.writeUInt32BE(payload.index, 5);

    //begin
    buf.writeUInt32BE(payload.begin, 9);

    //block
    payload.block.copy(buf, 13);

    return buf;
  }

  //<len=00013><id=8><index><begin><length>
  buildCancle(payload) {
    const buf = Buffer.alloc(17);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUint32BE(13, 0);

    //1 byte for the id of the message
    buf.writeUInt8(8, 4);

    //index
    buf.writeUint32BE(payload.index, 5);

    //begin
    buf.writeUint32BE(payload.begin, 9);

    //length
    buf.writeUint32BE(payload.length, 13);

    return buf;
  }

  buildPort(payload) {
    const buf = Buffer.alloc(7);

    //4 bytes indicating the length of the message (excluding these 4 bytes)
    buf.writeUInt32BE(3, 0);

    //1 byte for the id of the message
    buf.writeUInt8(9, 4);

    //listen-port
    buf.writeUInt16BE(payload, 5);

    return buf;
  }
}
