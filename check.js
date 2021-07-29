// import nacl = require("tweetnacl") // cryptographic functions
// import util = require("tweetnacl-util") // encoding & decoding 
// import { randomBytes } from 'tweetnacl';
const util = nacl.util;
const keypairA = nacl.box.keyPair();
// const receiverPublicKeyA = util.encodeBase64(keypairA.publicKey);
// const receiverSecretKeyA = util.encodeBase64(keypairA.secretKey);
const receiverPublicKeyA = keypairA.publicKey;
const receiverSecretKeyA = keypairA.secretKey;

const keypairB = nacl.box.keyPair();
// const receiverPublicKeyB = util.encodeBase64(keypairB.publicKey);
// const receiverSecretKeyB = util.encodeBase64(keypairB.secretKey);
const receiverPublicKeyB = keypairB.publicKey;
const receiverSecretKeyB = keypairB.secretKey;

const newNonce = () => nacl.randomBytes(nacl.box.nonceLength);
const encrypt = (secretOrSharedKey, json, key) => {
    const nonce = newNonce();
    const messageUint8 = util.decodeUTF8(JSON.stringify(json));
    const encrypted = key ?
        nacl.box(messageUint8, nonce, key, secretOrSharedKey) :
        nacl.box.after(messageUint8, nonce, secretOrSharedKey);

    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);

    const base64FullMessage = util.encodeBase64(fullMessage);
    return base64FullMessage;
};

const decrypt = (secretOrSharedKey, messageWithNonce, key) => {
    const messageWithNonceAsUint8Array = util.decodeBase64(messageWithNonce);
    const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength);
    const message = messageWithNonceAsUint8Array.slice(
        nacl.box.nonceLength,
        messageWithNonce.length
    );

    const decrypted = key ?
        nacl.box.open(message, nonce, key, secretOrSharedKey) :
        nacl.box.open.after(message, nonce, secretOrSharedKey);

    if (!decrypted) {
        throw new Error('Could not decrypt message');
    }

    const base64DecryptedMessage = util.encodeUTF8(decrypted);
    return JSON.parse(base64DecryptedMessage);
};

var obj = { hello: "Hello, my life is fucked up!" };
const sharedA = nacl.box.before(receiverPublicKeyB, receiverSecretKeyA);
const sharedB = nacl.box.before(receiverPublicKeyA, receiverSecretKeyB);
const encrypted = encrypt(sharedA, obj);
const decrypted = decrypt(sharedB, encrypted);

console.log(obj);
console.log(encrypted);
console.log(decrypted);