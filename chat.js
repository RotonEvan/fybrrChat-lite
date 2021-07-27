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
const roomName = 'observable-' + chatHash;
// Scaledrone room used for signaling
let room;

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
    startListentingToSignals();
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
    const data = {
        selfname,
        content: txt,
        emoji,
        m_id: uuidv4()
    };
    insertMessageToDOM(data, true);
    let result = await node.add(JSON.stringify(data));
    console.log(result);
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

    let jsonmsg = JSON.parse(msg);

    // console.log(jsonmsg);

    if (document.getElementById("msg")) {
        document.getElementById("msg").innerHTML = msg;
    } else {
        insertMessageToDOM(jsonmsg);
    }

}

// Updating UI

function insertMessageToDOM(options, isFromMe = false) {
    const template = document.querySelector('template[data-template="message"]');
    const nameEl = template.content.querySelector('.message__name');
    if (options.emoji || options.selfname) {
        nameEl.innerText = options.selfname + ' ' + options.emoji;
    }
    template.content.querySelector('.message__bubble').innerText = options.content;
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

    sendSignalingMessage({ 'newHash': senthash });


});