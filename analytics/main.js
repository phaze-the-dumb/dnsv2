const fs = require('fs');
const c = require('./couters.js');
const a = require('express').Router();
const apps = require('../apps/loader.js');

const security = require('../security/main.js');
let getScript = () => {
    let text = fs.readFileSync(__dirname + '/html.js').toString() + '\n';

    apps.apps.forEach(app => {
        text += '\n// Code From: '+app.name+'\n'+app.interface.client;
    })

    return text;
}

security.runUpdates();
c.runUpdates();

a.use((req, res, next) => {
    res.header('access-control-allow-origin', '*');
    next();
})

a.post('/page', (req, res, next) => {
    res.header('access-control-allow-origin', '*');

    if(!req.query.url || !req.query.loadTime)return next();
    global.logger.info('[ANALYTICS] Page Requested: '+req.query.url);
    security.onPage(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.query.url);
    
    let id = c.onPage(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.query.url, req.query.loadTime);
    res.json({ ok: true, id });
})

a.post('/pagec', (req, res, next) => {
    res.header('access-control-allow-origin', '*');
    
    let id = req.query.id;
    let x = req.query.x;
    let y = req.query.y;
    let target = req.query.target;

    if(!c.pageExists(id))return res.json({ ok: false, error: 'Page Does Not Exist' });
    if(!x || !y || !target || !id)return res.json({ ok: false, error: 'Missing Data' });
    
    global.logger.info('[ANALYTICS] Page Clicked: '+c.pages.find(x => x.id === id).url);

    c.updatePageClicks(id, { x, y, target, time: Date.now() });
    res.json({ ok: true });
})

module.exports = { getScript, c, a };