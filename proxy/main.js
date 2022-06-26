const { randomUUID } = require('crypto');
const ct = require('./contenttype.js');
const fs = require('fs');

let interceptors = [];
if(!fs.existsSync('proxy/staticfiles'))fs.mkdirSync('proxy/staticfiles');

let run = ( logger ) => {
    const config = require('../config.json');
    const actualhttp = require('http');
    
    let http = require('http');
    if(config.useSSL)http = require('https');

    const analytics = require('../analytics/main.js');
    const security = require('../security/main.js');
    const records = require('./records.js');

    const errors = {
        404: fs.readFileSync('templates/error.html').toString().split('{{ code }}').join('404').split('{{ text }}').join('Page Not Found'),
        500: fs.readFileSync('templates/error.html').toString().split('{{ code }}').join('500').split('{{ text }}').join('Internal Server Error'),
        501: fs.readFileSync('templates/error.html').toString().split('{{ code }}').join('500').split('{{ text }}').join('Server Didn\'t Respond')
    }

    let port = 80;
    if(config.useSSL)port = 443;

    http.createServer({
        key: fs.readFileSync('keys/key.pem'),
        cert: fs.readFileSync('keys/cert.pem')
    }, (req, res) => {
        let startTime = Date.now();

        let icpts = [];
        interceptors.forEach(i => {
            let fil = i.filter(req)
            if(fil)icpts.push(i);
        });

        let runIcpts = ( i = 0, after ) => {
            let inter = icpts[i];

            if(!inter)return after();

            inter.cb(req, res, () => {
                if(icpts[i + 1])
                    runIcpts(i + 1, after)
                else
                    after()
            })
        }

        runIcpts(0, () => {
            let data = records.getRecord(req.headers.host);
            if(!data){
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(errors[404]);
                return;
            }
    
            if(data.tmp){
                data.cb(req, res);
    
                security.onRequest(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.url, req.headers['CF-IPCountry'], Date.now() - startTime);
                analytics.c.onRequest(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.url, req.headers['CF-IPCountry'], Date.now() - startTime);
            } else if(data.static){
                security.onRequest(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.url, req.headers['CF-IPCountry'], Date.now() - startTime);
                analytics.c.onRequest(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.url, req.headers['CF-IPCountry'], Date.now() - startTime);
    
                try{
                    let file = '';
                    let content = ''
    
                    if(req.url === '/'){
                        file = 'proxy/staticfiles/' + data.id + '/index.html';
                        content = fs.readFileSync('proxy/staticfiles/' + data.id + '/index.html')
                    } else{
                        if(fs.existsSync('proxy/staticfiles/' + data.id + req.url + '.html')){
                            file = 'proxy/staticfiles/' + data.id + req.url + '.html';
                            content = fs.readFileSync('proxy/staticfiles/' + data.id + req.url + '.html')
                        } else if(fs.existsSync('proxy/staticfiles/' + data.id + req.url)){
                            file = 'proxy/staticfiles/' + data.id + req.url
                            content = fs.readFileSync('proxy/staticfiles/' + data.id + req.url)
                        } else{
                            file = 'error.html';
                            content = errors[404];
                        }
                    }

                    let type = ct[file.split('.').pop()]
                    let h = { 'content-type': type };
    
                    if(content.includes('<head>')){
                        content = content.toString();
                        content = content.toString().replace('<head>', '<head><script>' + analytics.getScript() + '</script>');
                        
                        logger.info('[PROXY] '+req.method+' '+req.headers.host+' '+req.url);
                        h['content-length'] = content.length;
    
                        res.writeHead(200, h);
                        res.end(content);
                    } else{
                        res.writeHead(200, h);
                        res.end(content);
                    }
                } catch(e){
                    res.end(errors[500]);
                    logger.error(e);
                }
            } else{
                let request = actualhttp.request({
                    host: data.ip,
                    port: data.port,
                    method: req.method,
                    path: req.url,
                    headers: req.headers,
                }, (resp) => {
                    let content = Buffer.from('');
        
                    resp.on('data', chunk => {
                        content = Buffer.concat([ content, chunk ]);
                    })
        
                    resp.on('end', () => {
                        resp.headers['x-server'] = 'Phaze WebProxy-Sea';
        
                        if(content.includes('<head>')){
                            content = content.toString();
                            content = content.toString().replace('<head>', '<head><script>' + analytics.getScript() + '</script>');
                            
                            logger.info('[PROXY] '+req.method+' '+req.headers.host+' '+req.url);
                            resp.headers['content-length'] = content.length;
        
                            res.writeHead(resp.statusCode, resp.headers);
                            res.end(content);
                        } else{
                            res.writeHead(resp.statusCode, resp.headers);
                            res.end(content);
                        }
        
                        security.onRequest(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.url, req.headers['CF-IPCountry'], Date.now() - startTime);
                        analytics.c.onRequest(req.socket.remoteAddress || req.headers['CF-Connecting-IP'], req.headers, req.method, req.headers.host, req.url, req.headers['CF-IPCountry'], Date.now() - startTime);
                    });
                })
        
                request.on('error', ( e ) => {
                    logger.error(e);

                    if(e.code === 'ECONNREFUSED'){
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end(errors[501]);
        
                        logger.warn('[PROXY] Server didn\'t respond '+req.method+' '+req.headers.host+' '+req.url);
                    } else{
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end(errors[500]);
        
                        logger.warn('[PROXY] 500 Internal Server Error '+req.method+' '+req.headers.host+' '+req.url);
                    }
                })
        
                req.pipe(request);
            }
        })
    }).listen(port);
}   

let addIntercept = ( filter, cb ) => {
    global.logger.info('[PROXY] Adding Intercept');
    let id = randomUUID();

    interceptors.push({ filter, cb, id });
    return id;
}

let removeIntercept = ( id ) => {
    global.logger.info('[PROXY] Removing Intercept');
    interceptors = interceptors.filter(x => x.id !== id);
}

module.exports = { run, addIntercept, removeIntercept };