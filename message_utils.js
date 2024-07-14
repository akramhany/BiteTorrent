export default class MessageUtils {
  static assembleWholeMsg(socket, callback) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    socket.on("data", (recvBuf) => {
      const msgLen = () => {
        return handshake
          ? savedBuf.readUInt8(0) + 49 //49 bit of handshake msg + length of the protocol name
          : savedBuf.readUInt32BE(0) + 4; //length of the msg + the 4 bytes storing the length
      };

      savedBuf = Buffer.concat([savedBuf, recvBuf]);

      //loop until the existing buffer size is smaller than the msg length
      while (savedBuf >= 4 && savedBuf.length > msgLen()) {
        callback(savedBuf.subarray(0, msgLen()));
        savedBuf = savedBuf.subarray(msgLen());
        handshake = false;
      }
    });
  }

  static parse(msg) {
    //if the msg.length <= 4, it's the keep-alive msg that has no id
    const id = msg.length > 4 ? msg.readInt8(4) : null;

    //if the msg.length <= 5, then the msg doesn't have a payload
    let payload = msg.length > 5 ? msg.slice(5) : null;

    //if id is 6, 7 or 8 then the payload has different structure.
    if (id === 6 || id === 7 || id === 8) {
      const rest = payload.slice(8);
      payload = {
        index: payload.readInt32BE(0),
        begin: payload.readInt32BE(4),
      };
      payload[id === 7 ? "block" : "length"] = rest;
    }

    return {
      size: msg.readInt32BE(0),
      id: id,
      payload: payload,
    };
  }
}
