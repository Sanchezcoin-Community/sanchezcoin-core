const cbor = require('cbor');


// Wandelt eine Byte Liste in eine Liste um
function byteListToObjectList(bdata) {
    return cbor.decode(bdata);
};


module.exports = {
    byteListToObjectList:byteListToObjectList
}