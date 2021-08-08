'use strict'

const possibleEmojis = [
    '🐀', '🐁', '🐭', '🐹', '🐂', '🐃', '🐄', '🐮', '🐅', '🐆', '🐯', '🐇', '🐐', '🐑', '🐏', '🐴',
    '🐎', '🐱', '🐈', '🐰', '🐓', '🐔', '🐤', '🐣', '🐥', '🐦', '🐧', '🐘', '🐩', '🐕', '🐷', '🐖',
    '🐗', '🐫', '🐪', '🐶', '🐺', '🐻', '🐨', '🐼', '🐵', '🙈', '🙉', '🙊', '🐒', '🐉', '🐲', '🐊',
    '🐍', '🐢', '🐸', '🐋', '🐳', '🐬', '🐙', '🐟', '🐠', '🐡', '🐚', '🐌', '🐛', '🐜', '🐝', '🐞',
];

function randomEmoji() {
    var randomIndex = Math.floor(Math.random() * possibleEmojis.length);
    return possibleEmojis[randomIndex];
}

let emoji = randomEmoji();
let selfname = prompt('Enter your name', '');

// easter-egg
if (selfname === 'lit' || selfname === 'LIT') {
    selfname = 'I am LIT';
    emoji = '🔥';
}


document.addEventListener('DOMContentLoaded', async() => {
    const repoPath = 'ipfs-' + Math.random()
    const node = await Ipfs.create({ repo: repoPath })
    window.node = node
    const status = node.isOnline() ? 'online' : 'offline'
    console.log(`Node status: ${status}`);
    insertMessageToDOM({ content: 'You are Ready to Chat on fybrrChat' });
})

// Generate random chat hash if needed
if (!location.hash) {
    location.hash = prompt('Enter Room ID if you have one, leave blank for a random Room ID', Math.floor(Math.random() * 0xFFFFFF).toString(16));
}
const chatHash = location.hash.substring(1);

/**
 * ScaleDrone initialization and methods
 */

const drone = new ScaleDrone('mMKnE5Dm1lX7ktjf');
// Scaledrone room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + chatHash + 'group';
// Scaledrone room used for signaling
let room;

const util = nacl.util;

const newNonce = () => nacl.randomBytes(nacl.secretbox.nonceLength);

const generateKey = () => util.encodeBase64(nacl.randomBytes(nacl.secretbox.keyLength));

let key;

const JsonToArray = function(json) {
    // var str = JSON.stringify(json, null, 0);
    // console.log(str);
    var ret = new Uint8Array(32);
    for (var i = 0; i < 32; i++) {
        ret[i] = json[i];
    }
    return ret
};

const encrypt = (json, key) => {
    const keyUint8Array = util.decodeBase64(key);

    const nonce = newNonce();
    const messageUint8 = util.decodeUTF8(JSON.stringify(json));
    const box = nacl.secretbox(messageUint8, nonce, keyUint8Array);

    const fullMessage = new Uint8Array(nonce.length + box.length);
    fullMessage.set(nonce);
    fullMessage.set(box, nonce.length);

    const base64FullMessage = util.encodeBase64(fullMessage);
    return base64FullMessage;
};

const decrypt = (messageWithNonce, key) => {
    const keyUint8Array = util.decodeBase64(key);
    const messageWithNonceAsUint8Array = util.decodeBase64(messageWithNonce);
    const nonce = messageWithNonceAsUint8Array.slice(0, nacl.secretbox.nonceLength);
    const message = messageWithNonceAsUint8Array.slice(
        nacl.secretbox.nonceLength,
        messageWithNonce.length
    );

    const decrypted = nacl.secretbox.open(message, nonce, keyUint8Array);

    if (!decrypted) {
        throw new Error("Could not decrypt message");
    }

    const base64DecryptedMessage = util.encodeUTF8(decrypted);
    return JSON.parse(base64DecryptedMessage);
};

// Wait for Scaledrone signalling server to connect
drone.on('open', error => {
    if (error) {
        return console.error(error);
    }
    room = drone.subscribe(roomName);
    room.on('open', error => {
        if (error) {
            return console.error(error);
        }
        console.log('Connected to signaling server');
    });
    room.on('members', members => {
        if (members.length == 1) {
            key = generateKey();
            startListentingToSignals();
        } else {
            startListentingToSignals();
            sendSignalingMessage({ 'hello': 'love' });
        }
    });

});

// Send signaling data via Scaledrone
function sendSignalingMessage(message) {
    drone.publish({
        room: roomName,
        message
    });
}

function startListentingToSignals() {
    // Listen to signaling data from Scaledrone
    room.on('data', (message, client) => {
        // Message was sent by us
        if (client.id === drone.clientId) {
            return;
        }
        if (message.newHash) {
            catMsg(message.newHash);
        } else if (message.hello) {
            sendSignalingMessage({ pk: key });
        } else if (message.pk) {
            if (!(key)) {
                let pkey = message.pk;
                key = pkey;
                // key = JsonToArray(pkey);
                // console.log(key);
                // shared = nacl.box.before(key, secretKey);
                // sendSignalingMessage({ pk: publicKey });
            }
        }
    });
}

async function sendTxt() {
    let txt = document.getElementById("txt").value;

    let senthash = await addTxt(JSON.stringify(data));
    document.getElementById("sent").innerHTML = senthash;
}

async function addTxt(txt) {
    // TODO: Message Structure
    const obj = {
        selfname,
        content: txt,
        emoji,
        m_id: uuidv4()
    };
    insertMessageToDOM(obj, true);
    let data = encrypt(obj, key);
    let result = await node.add(data);
    // console.log(result);
    return result.path;
}

async function recTxt() {
    let recvhash = document.getElementById("recvhash").value;
    catMsg(recvhash);
}

async function catMsg(recvhash) {
    const stream = await node.cat(recvhash)
    let msg = ""

    for await (const chunk of stream) {
        // chunks of data are returned as a Buffer, convert it back to a string
        msg += chunk.toString()
    }

    // console.log(msg);
    let jsonmsg = await decrypt(msg, key);

    // console.log(jsonmsg);

    if (document.getElementById("msg")) {
        document.getElementById("msg").innerHTML = jsonmsg;
    } else {
        insertMessageToDOM(jsonmsg);
    }

}

// Updating UI

function linkify(text) {
    var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
}

function insertMessageToDOM(options, isFromMe = false) {
    const template = document.querySelector('template[data-template="message"]');
    const nameEl = template.content.querySelector('.message__name');
    if (options.emoji || options.selfname) {
        nameEl.innerText = options.selfname + ' ' + options.emoji;
    }
    let msgcontent;
    let msgcontent_sanitized;
    msgcontent = options.content;
    msgcontent_sanitized = linkify(msgcontent);
    template.content.querySelector('.message__bubble').innerHTML = msgcontent_sanitized;
    const clone = document.importNode(template.content, true);
    const messageEl = clone.querySelector('.message');
    if (isFromMe) {
        messageEl.classList.add('message--mine');
    } else {
        messageEl.classList.add('message--theirs');
    }

    const messagesEl = document.querySelector('.messages');
    messagesEl.appendChild(clone);

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight - messagesEl.clientHeight;
}

const form = document.querySelector('form');
form.addEventListener('submit', async() => {
    const input = document.querySelector('input[type="text"]');
    const value = input.value;
    input.value = '';

    let senthash = await addTxt(value);

    pinByHash(senthash);

    sendSignalingMessage({ 'newHash': senthash });
});


function pinByHash(hashToPin) {

    const url = `https://api.pinata.cloud/pinning/pinByHash`;
    const body = {
        hashToPin: hashToPin,
        // hostNodes: [
        //     '/ip4/hostNode1ExternalIP/tcp/4001/ipfs/hostNode1PeerId',
        //     '/ip4/hostNode2ExternalIP/tcp/4001/ipfs/hostNode2PeerId'
        // ],
        pinataMetadata: {
            name: 'fybrrChat-lite',
            keyvalues: {
                customKey: 'fybrrChat-lite'
            }
        }
    };

    axios.post(url, body, {
        headers: {
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwNGY4OWM5Yi1hMzRiLTRlN2MtYWNjOS0wNTIxYmUwZDcyOGYiLCJlbWFpbCI6ImRlYmFqeW90aTIwMDFAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siaWQiOiJOWUMxIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZX0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImZiOWZiZGNiOWVjYjJkYjVmOTdhIiwic2NvcGVkS2V5U2VjcmV0IjoiYjI3YjRlMTM4YzliMzNhOTE0NWU3ZDY5ZmFiODM0OGVjMTRmZmYwNjU1MmYzNzlhZTIxZWI5ZmExNzgwZmI2NyIsImlhdCI6MTYyNzQyMDQwOH0.Y3Z5A3Bg3fHrMwxWoy_u4s6hfE_Zpa_PN0F0e-nv33s"
        }
    }).then(function(response) {
        //handle response here
        // console.log(response);
    }).catch(function(error) {
        //handle error here
        console.log(error);
    });
}