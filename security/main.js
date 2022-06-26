const data = require('../storage/security.json');
const fs = require('fs');

let waitingRequests = [];
let queue = 0;

if(!data.bots)
    data.bots = [];

fs.writeFileSync('storage/security.json', JSON.stringify(data));

let runUpdates = () => {
    setInterval(() => {
        if(queue === 1){
            fs.writeFileSync('storage/security.json', JSON.stringify(data));
            queue = 0;
        }
    }, 1000)
}

let queueWrite = ( place, d ) => {
    data[place].push(d);
    queue = 1;
}

let onRequest = (ip, headers, method, host, url, location, internalTime) => {
    let t = setTimeout(() => {
        queueWrite('bots', { ip, headers, method, host, url, location, internalTime });
        waitingRequests = waitingRequests.filter(x => x.ip !== ip);
    }, 1000);

    waitingRequests.push({ ip, t });
}

let onPage = (ip, headers, method, host, url) => {
    let req = waitingRequests.find(x => x.ip === ip);
    waitingRequests = waitingRequests.filter(x => x.ip !== ip);

    clearTimeout(req);
}

module.exports = { onPage, onRequest, runUpdates, data };