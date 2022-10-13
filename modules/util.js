export function chunk(chunkable ,chunkSize){
    let chunked = new Array();
    for (let i = 0; i < chunkable.length; i += chunkSize) {
        chunked.push(chunkable.slice(i, i + chunkSize));
    }
    return chunked
  };
  
  export function stripPrefix(hex) {
    return hex.replace(/^0x/, "");
  }
  
  export function fromHex(hexStr) {
    var hexStrLength = hexStr.length;
  
    var words = [];
    for (var i = 0; i < hexStrLength; i += 2) {
        words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
    }
  
    return new WordArray.init(words, hexStrLength / 2);
  }