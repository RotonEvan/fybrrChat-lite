// document.getElementById('search').off('click');

let selfname;
let uid;
let usr;
let signed;

let localStorage = window.localStorage;
let sessionStorage = window.sessionStorage;

let db = firebase.firestore();
let users = db.collection('users');
// let msgHash = db.collection('msgHash');

let selfEmail;
let peerEmail;

let peerid;

const util = nacl.util;

let publicKey;
let secretKey;
let peerKey;

function XOR_hex(a, b) {
    var res = "",
        i = a.length,
        j = b.length;
    while (i-- > 0 && j-- > 0)
        res = (parseInt(a.charAt(i), 16) ^ parseInt(b.charAt(j), 16)).toString(16) + res;
    return res;
}

function clicked() {
    let str = document.getElementById('search').innerText;
    console.log(str);
    if (str == 'SEARCH') {
        searchPeer();
    } else {
        chatWithPeer();
    }
}

async function searchPeer() {
    peerid = null;
    let peer = document.getElementById('peer').value;
    let peername;
    console.log(peer);
    await users.where('email', '==', peer.toString()).get().then((snap) => {
        snap.forEach(doc => {
            console.log(doc.id, ' => ', doc.data());
            peerid = doc.id;
            peerKey = doc.data().pubkey;
            peername = doc.data().name;
        });
    }).catch(error => {
        console.error(error);
    });
    if (peerid) {
        document.getElementById('search').innerHTML = 'fybrrChat with ' + peername + '!';
    } else {
        document.getElementById('search').innerHTML = 'Search';
        alert('Probably your friend hasn\'t heard of fybrrChat yet 😕');
    }
}

function chatWithPeer() {
    let room = XOR_hex(uid, peerid);
    sessionStorage.setItem(room, peerid);
    localStorage.setItem(room, peerid);
    // sessionStorage.setItem(peerid, peerKey);
    // localStorage.setItem(peerid, peerKey);
    window.location.href = './chat.html#' + room;
}

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
    document.getElementById('quickstart-sign-in').disabled = true;
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
            document.getElementById('quickstart-sign-in').textContent = 'Signed in as ' + selfname;
            document.getElementById('search').disabled = false;
            // document.getElementById('quickstart-account-details').textContent = JSON.stringify(user, null, '  ');
        } else {
            signed = false;
            // User is signed out.
            // document.getElementById('quickstart-sign-in-status').textContent = 'Signed out';
            document.getElementById('quickstart-sign-in').textContent = 'Sign in with Google';
            document.getElementById('search').disabled = true;
            usr = null;
            // document.getElementById('quickstart-account-details').textContent = 'null';
            // document.getElementById('quickstart-oauthtoken').textContent = 'null';
        }
        document.getElementById('quickstart-sign-in').disabled = false;
    });

    document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);
}

window.onload = function() {
    initApp();
};