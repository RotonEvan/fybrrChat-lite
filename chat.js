'use strict'

document.addEventListener('DOMContentLoaded', async() => {
    const repoPath = 'ipfs-' + Math.random()
    const node = await Ipfs.create({ repo: repoPath })
    window.node = node
    const status = node.isOnline() ? 'online' : 'offline'
    console.log(`Node status: ${status}`);
    // let result = await node.add("txt hello 123");
    // console.log(result);
})

async function sendTxt() {
    let txt = document.getElementById("txt").value;

    let senthash = await addTxt(txt);
    document.getElementById("sent").innerHTML = senthash;
}

async function addTxt(txt) {
    let result = await node.add(txt);
    console.log(result);
    return result.path;
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