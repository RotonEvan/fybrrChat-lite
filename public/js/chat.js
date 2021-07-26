'use strict'

if (!location.hash) {
    location.hash = uuidv4();
}

let peers = {};
let self = uuidv4();
let selfname = prompt('Enter your name', '');
let room = location.hash.substring(1);
let serverConnection;

document.addEventListener('DOMContentLoaded', async() => {
    const repoPath = 'ipfs-' + Math.random();
    const node = await Ipfs.create({ repo: repoPath });
    // const node = window.IpfsApi('127.0.0.1', 5001);
    window.node = node;
    // const status = node.isOnline() ? 'online' : 'offline';
    // console.log(`Node status: ${status}`);
    serverConnection = new WebSocket('wss://' + location.host);
    serverConnection.onmessage = gotMessageFromServer;
    serverConnection.onopen = event => {
        serverConnection.send(JSON.stringify({ 'self': self, 'room': room, 'join': true }));
        console.log("joining request sent");
    }
});

async function gotMessageFromServer(message) {
    let signal = JSON.parse(message.data);

    if (signal.joined) {
        serverConnection.send(JSON.stringify({ 'hello': true, 'id': self, 'name': selfname, 'room': room, 'dest': 'all' }));
    } else if (signal.hello) {
        if (!peers[signal.id]) {
            peers[signal.id] = { 'id': signal.id, 'name': signal.selfname };
            serverConnection.send(JSON.stringify({ 'hello': true, 'id': self, 'name': selfname, 'room': room, 'dest': 'all' }));
        }
    } else if (signal.ping) {
        const stream = await node.cat(signal.recvhash)
        let msg = ""

        for await (const chunk of stream) {
            // chunks of data are returned as a Buffer, convert it back to a string
            msg += chunk.toString()
        }

        document.getElementById("msg").innerHTML = msg;
    }
}

async function sendTxt() {
    let txt = document.getElementById("txt").value;

    let senthash = await addTxt(txt);

    serverConnection.send(JSON.stringify({ 'ping': true, 'id': self, 'room': room, 'hash': senthash, 'dest': 'all' }));

    document.getElementById("sent").innerHTML = senthash;
}

async function addTxt(txt) {
    let res;
    // const buf = buffer.Buffer(txt); // Convert data into buffer
    // node.files.add(buf, (err, result) => { // Upload buffer to IPFS
    //     if (err) {
    //         console.error(err)
    //         return
    //     }
    //     res = result[0].hash
    //     console.log(res);
    // });
    res = await node.add(txt);
    console.log(res);
    return res;
}

async function recTxt() {
    let recvhash = document.getElementById("recvhash").value;
    const stream = await node.cat(recvhash)
    let msg = ""

    for await (const chunk of stream) {
        // chunks of data are returned as a Buffer, convert it back to a string
        msg += chunk.toString()
    }

    document.getElementById("msg").innerHTML = msg;
}