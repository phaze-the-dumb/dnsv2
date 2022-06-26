const records = require('../proxy/records.js');
const analytics = require('../analytics/interface.js');
const security = require('../security/interface.js');
const a = require('../analytics/main.js')
const proxy = require('../proxy/main.js');
const ejs = require('ejs');

class Handle{
    constructor(method, path, cbs){
        this.method = method;
        this.path = path;
        this.cbs = cbs;
    }
}

class Interface{
    constructor(app, logger){
        this.app = app;
        this.console = {
            log: logger.info,
            info: logger.info,
            warn: logger.warn, 
            error: logger.error
        };

        this.setTimeout = setTimeout;
        this.setInterval = setInterval;
        this.clearInterval = clearInterval;
        this.clearTimeout = clearTimeout;

        this.client = '';

        let pages = [];
        this.getPages = () => pages;

        class Page{
            constructor(path){
                logger.info('['+app.name+'] Created Page: /panel/c'+path)

                this.html = '';
                this.url = path;

                pages.push(this);                
            }
            setHTML(html){
                this.html = html;
            }
        }

        class App{
            constructor(subdomain, domain){
                this.defaultHandle = new Handle('*', '*', [( req, res ) => {
                    res.send('Cannot '+req.method + ' ' + req.url);
                }])
                this.handles = [];
                app.routes.push(this);

                this.domain = subdomain + '.' + domain;
                if(subdomain === '@')this.domain = domain;

                this.record = records.registerTMPRecord(domain, subdomain, app.name, ( req, res ) => {
                    let handlesToUse = [];

                    this.handles.forEach(h => {
                        if(
                            (h.path === '*' || h.path === req.url) &&
                            (h.method === '*' || h.method === req.method)
                        ){
                            handlesToUse.push(h);
                        }
                    })

                    handlesToUse.push(this.defaultHandle);

                    let runHandle = ( i = 0 ) => {
                        let e = this.genExpressReqRes(req, res);
                        handlesToUse[i].cbs[0](e.req, e.res, () => { runHandle( i + 1 ) });
                    }

                    runHandle(0);
                });
            }
            get(path, ...cbs){
                this.handles.push(new Handle('GET', path, cbs));
            }
            post(path, ...cbs){
                this.handles.push(new Handle('POST', path, cbs));
            }
            put(path, ...cbs){
                this.handles.push(new Handle('PUT', path, cbs));
            }
            delete(path, ...cbs){
                this.handles.push(new Handle('DELETE', path, cbs));
            }
            use(path, ...cbs){
                this.handles.push(new Handle('*', path, cbs));
            }
            genExpressReqRes(req, res){
                return {
                    req,
                    res: {
                        send: ( content, status = 200, headers = { 'content-type': 'text/html' } ) => {

                            if(content.includes('<head>') && headers['content-type'] === 'text/html'){
                                content = content.toString();
                                content = content.toString().replace('<head>', '<head><script>' + a.getScript() + '</script>');
             
                                logger.info('[PROXY] '+req.method+' '+req.headers.host+' '+req.url);
                                headers['content-length'] = content.length;
            
                                res.writeHead(status, headers);
                                res.end(content);
                            } else{
                                res.writeHead(status, headers);
                                res.end(content);
                            }
                        },
                        json: ( json, status = 200, headers = { 'content-type': 'application/json' } ) => {
                            res.writeHead(status, headers);
                            res.end(JSON.stringify(json));
                        },
                        render: ( filename, status = 200, headers = { 'content-type': 'text/html' } ) => {
                            res.writeHead(status, headers);
                            res.end(ejs.renderFile(filename));
                        },
                        res: res
                    }
                }
            }
        }

        let apiPkg = { records, analytics, security, App, proxy, setClient: ( code ) => { this.client = code }, Page };
        this.require = ( pkgName ) => {
            if(pkgName === 'PDNS'){
                return apiPkg;
            } else {
                return require(pkgName);
            }
        }
    }
}

module.exports = Interface;