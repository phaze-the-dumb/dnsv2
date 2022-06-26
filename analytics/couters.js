const data = require('../storage/analytics.json');
const fs = require('fs');
const { randomUUID } = require('crypto');

let queue = 0;

if(!data.requests)
    data.requests = [];

if(!data.unique)
    data.unique = [];

if(!data.real)
    data.real = [];

if(!data.country)
    data.country = [];

if(!data.pages)
    data.pages = [];

fs.writeFileSync('storage/analytics.json', JSON.stringify(data));

let queueWrite = ( place, d ) => {
    data[place].push(d);
    queue = 1;
}

let onRequest = ( ip, headers, method, host, url, location, internalTime ) => {
    location = location || 'Unknown';

    let id = randomUUID();
    queueWrite('requests', { id, ip, headers, method, host, url, location, internalTime, time: Date.now() });

    return id;
}

let onPage = ( ip, headers, method, host, url, loadTime ) => {
    let id = randomUUID();
    queueWrite('pages', { id, clicks: [], host, url: url, ip, headers, method, time: Date.now(), loadTime });

    return id;
}

let updatePageClicks = ( id, click ) => {
    let page = data.pages.find(p => p.id === id);

    if(page){
        page.clicks.push(click);
        queue = 1;
    }
}

let pageExists = ( id ) => {
    let page = data.pages.find(p => p.id === id);
    if(!page)return false;

    return true;
}

let runUpdates = () => {
    setInterval(() => {
        if(queue === 1){
            fs.writeFileSync('storage/analytics.json', JSON.stringify(data));
            queue = 0;
        }
    }, 1000)
}


module.exports = { queueWrite, onPage, onRequest, updatePageClicks, pageExists, pages: data.pages, data, runUpdates };