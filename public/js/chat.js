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

let localStorage = window.localStorage;
let sessionStorage = window.sessionStorage;

let emoji = randomEmoji();
let selfname;
let uid;
let usr = firebase.auth().currentUser;
let signed = (usr) ? true : false;

let db = firebase.firestore();
let users = db.collection('users');
let msgHash = db.collection('msgHash');

let selfEmail;
let peerEmail;
let peerid;

let aliveTime = 0;
let isPeerOnline = false;
// let selfname = prompt('Enter your name', '');

// easter-egg
// if (selfname === 'lit' || selfname === 'LIT') {
//     selfname = 'I am LIT';
//     emoji = '🔥';
// }


document.addEventListener('DOMContentLoaded', async() => {
    const repoPath = 'ipfs-' + Math.random()
    const node = await Ipfs.create({
        repo: repoPath,
        // preload: {
        //     enabled: true,
        //     addresses: ['/ip6/2606:4700:60::6/https'],
        // }
    })
    window.node = node
    const status = node.isOnline() ? 'online' : 'offline'
    console.log(`Node status: ${status}`);
    let validip4 = Multiaddr.multiaddr('/ip4/172.65.0.13/tcp/4009/p2p/QmcfgsJsMtx6qJb74akCw1M24X1zFwgGo11h1cuhwQjtJP');
    const resp = await node.bootstrap.add(validip4);
    console.log(resp);
    initApp();
    console.log(`Signed? - ${signed}`);
    console.log(`FireAuth? - ${firebase.auth().currentUser}`);
})

// Generate random chat hash if needed
if (!location.hash) {
    location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const chatHash = location.hash.substring(1);

/**
 * ScaleDrone initialization and methods
 */

let drone;
// Scaledrone room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + chatHash + '-dm';
// Scaledrone room used for signaling
let room;
let ready = false;

function initDrone() {
    drone = new ScaleDrone('mMKnE5Dm1lX7ktjf');
    // Wait for Scaledrone signalling server to connect
    drone.on('open', error => {
        if (error) {
            return console.error(error);
        }
        room = drone.subscribe(roomName);
        room.on('open', async(error) => {
            ready = true;
            if (error) {
                return console.error(error);
            }
            console.log('Connected to signaling server');
            if (sessionStorage.getItem(chatHash)) {
                peerid = sessionStorage.getItem(chatHash);
            } else if (localStorage.getItem(chatHash)) {
                peerid = localStorage.getItem(chatHash);
            } else {
                alert('You deserve better');
                window.location = '.';
            }
            if (peerid) {
                let uRef = await users.where('id', '==', peerid);
                uRef.onSnapshot((snap) => {
                    snap.forEach(doc => {
                        peerKey = stringToArray(doc.data().pubkey);
                        shared = nacl.box.before(peerKey, secretKey);
                    });
                });
                // if (sessionStorage.getItem(peerid)) {
                //     peerKey = sessionStorage.getItem(peerid);
                // } else if (localStorage.getItem(chatHash)) {
                //     peerKey = localStorage.getItem(chatHash);
                // } else {
                //     let uRef = await users.where('id', '==', peerid);
                //     uRef.get().then((snap) => {
                //         snap.forEach(doc => {
                //             peerKey = doc.data().pubkey;
                //         });
                //     });
                // }
            }
            checkMessages();
        });
        room.on('members', members => {
            if (members.length >= 3) {
                return alert('The room is full');
                //redirect to new room
            } else {
                startListentingToSignals();
                // if (signed) {
                //     sendSignalingMessage({ 'hello': 'hello' });
                // }
            }
        });

    });

}


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
        // console.log(message);
        if (message.newHash) {
            catMsg(message.newHash);
        } else if (message.hello) {
            sendSignalingMessage({ pk: publicKey, un: usr.displayName });
        } else if (message.pk) {
            let pkey = JsonToArray(message.pk);
            if (!(peerKey)) {
                peerKey = pkey;
                console.log(`no peerkey ${pkey}`);
                insertMessageToDOM({ content: 'You are chatting with ' + message.un });
                // console.log(peerKey);
                shared = nacl.box.before(peerKey, secretKey);
                sendSignalingMessage({ pk: publicKey, un: usr.displayName });
            } else if (peerKey.toString() === pkey.toString()) {
                console.log(`same peerkey exists ${pkey}`);
            } else {
                console.log(`new peerkey ${peerKey} ${pkey}`);
                peerKey = pkey;
                insertMessageToDOM({ content: 'You are chatting with ' + message.un });
                // console.log(peerKey);
                shared = nacl.box.before(peerKey, secretKey);
                // sendSignalingMessage({ pk: publicKey, un: usr.displayName });
            }
        } else if (message.alive) {
            aliveTime = Date.now();
        }
    });
}

setInterval(() => {
    if (ready) {
        sendSignalingMessage({ alive: true });
        if (Date.now() - aliveTime > 5000) {
            isPeerOnline = false;
        } else {
            isPeerOnline = true;
        }
    }
}, 3000);

function checkMessages() {
    msgHash.where('to', '==', uid).where('timestamp', '<=', Date.now()).get().then((snap) => {
        snap.forEach(doc => {
            catMsg(doc.data().hash);
            doc.ref.delete();
        });
    })
}

const util = nacl.util;

let publicKey;
let secretKey;



let peerKey;
let shared;

const newNonce = () => nacl.randomBytes(nacl.box.nonceLength);

const JsonToArray = function(json) {
    // var str = JSON.stringify(json, null, 0);
    // console.log(str);
    var ret = new Uint8Array(32);
    for (var i = 0; i < 32; i++) {
        ret[i] = json[i];
    }
    return ret
};

const stringToArray = function(str) {
    let strArray = str.split(',');
    return Uint8Array.from(strArray);
}

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



async function sendTxt() {
    let txt = document.getElementById("txt").value;

    let senthash = await addTxt(JSON.stringify(data));
    document.getElementById("sent").innerHTML = senthash;
}

async function addTxt(txt, m_id) {
    // TODO: Message Structure
    const obj = {
        selfname,
        content: txt,
        emoji,
        m_id: m_id
    };
    insertMessageToDOM(obj, true);
    let data = encrypt(shared, obj);
    console.log(data);
    let result = await node.add(data);
    console.log(result);
    return result.path;
}

async function recTxt() {
    let recvhash = document.getElementById("recvhash").value;
    catMsg(recvhash);
}

async function catMsg(recvhash) {
    console.log('check');
    const stream = await node.cat(recvhash)
    let msg = ""

    for await (const chunk of stream) {
        // chunks of data are returned as a Buffer, convert it back to a string
        msg += chunk.toString()
    }

    console.log(msg);
    let jsonmsg = await decrypt(shared, msg);

    // console.log(jsonmsg);

    if (document.getElementById("msg")) {
        document.getElementById("msg").innerHTML = jsonmsg;
    } else {
        insertMessageToDOM(jsonmsg);
    }

}

// Updating UI

function linkify(text) {
    var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
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
    if (!(firebase.auth().currentUser)) {
        toggleSignIn();
    } else {
        const input = document.querySelector('input[type="text"]');
        const value = input.value;
        input.value = '';

        let m_id = uuidv4();

        let senthash = await addTxt(value, m_id);

        pinByHash(senthash);

        if (!(isPeerOnline)) {
            let mRef = msgHash.doc(m_id);
            mRef.set({
                id: m_id,
                timestamp: Date.now(),
                from: uid,
                to: peerid,
                hash: senthash
            })
        }

        sendSignalingMessage({ 'newHash': senthash });
    }
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

/**
 * Function called when clicking the Login/Logout button.
 */
function toggleSignIn() {
    if (!firebase.auth().currentUser) {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/plus.login');
        firebase.auth().signInWithRedirect(provider);
    } else {
        firebase.auth().signOut();
        usr = null;
    }
    // document.getElementById('quickstart-sign-in').disabled = true;
}

/**
 * initApp handles setting up UI event listeners and registering Firebase auth listeners:
 *  - firebase.auth().onAuthStateChanged: This listener is called when the user is signed in or
 *    out, and that is where we update the UI.
 *  - firebase.auth().getRedirectResult(): This promise completes when the user gets back from
 *    the auth redirect flow. It is where you can get the OAuth access token from the IDP.
 */
function initApp() {
    // Result from Redirect auth flow.
    firebase.auth().getRedirectResult().then(function(result) {
        if (result.credential) {
            // This gives you a Google Access Token. You can use it to access the Google API.
            var token = result.credential.accessToken;
            // document.getElementById('quickstart-oauthtoken').textContent = token;
        } else {
            // document.getElementById('quickstart-oauthtoken').textContent = 'null';
        }
        // The signed-in user info.
        var user = result.user;
    }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // The email of the user's account used.
        var email = error.email;
        // The firebase.auth.AuthCredential type that was used.
        var credential = error.credential;
        if (errorCode === 'auth/account-exists-with-different-credential') {
            alert('You have already signed up with a different auth provider for that email.');
            // If you are using multiple auth providers on your app you should handle linking
            // the user's accounts here.
        } else {
            console.error(error);
        }
    });

    // Listening for auth state changes.
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in.
            signed = true;
            if (!drone) {
                initDrone();
            }
            console.log('drone init done');
            usr = user;
            selfname = user.displayName;
            selfEmail = user.email;
            // var emailVerified = user.emailVerified;
            // var photoURL = user.photoURL;
            // var isAnonymous = user.isAnonymous;
            uid = user.uid;

            if (localStorage.getItem(uid + '-priv-key')) {
                console.log('getting keys from local storage');
                secretKey = stringToArray(localStorage.getItem(uid + '-priv-key'));
                publicKey = stringToArray(localStorage.getItem(uid + '-pub-key'));
            } else {
                console.log('generating new keys and setting keys into local storage');
                const keypair = nacl.box.keyPair();
                publicKey = keypair.publicKey;
                secretKey = keypair.secretKey;
                localStorage.setItem(uid + '-priv-key', secretKey);
                localStorage.setItem(uid + '-pub-key', publicKey);
            }

            let uRef = users.doc(uid);
            uRef.get().then((doc) => {
                if (doc.exists) {
                    console.log('user doc exists');
                    console.log(doc.data());
                    let data = doc.data();
                    if (publicKey.toString() !== data.pubkey) {
                        console.log('updating public key in storage');
                        uRef.update({
                            pubkey: publicKey.toString()
                        })
                    }
                } else {
                    console.log('new user');
                    uRef.set({
                        id: uid,
                        email: selfEmail,
                        name: selfname,
                        pubkey: publicKey.toString()
                    })
                }
            });
            // var providerData = user.providerData;
            // document.getElementById('quickstart-sign-in-status').textContent = 'Signed in';
            // document.getElementById('quickstart-sign-in').textContent = 'Sign out';
            // document.getElementById('quickstart-account-details').textContent = JSON.stringify(user, null, '  ');
        } else {
            signed = false;
            // User is signed out.
            // document.getElementById('quickstart-sign-in-status').textContent = 'Signed out';
            // document.getElementById('quickstart-sign-in').textContent = 'Sign in with Google';
            usr = null;
            // document.getElementById('quickstart-account-details').textContent = 'null';
            // document.getElementById('quickstart-oauthtoken').textContent = 'null';
        }
        // document.getElementById('quickstart-sign-in').disabled = false;
    });

    // document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);
}