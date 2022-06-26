let run = ( getErrors, logger ) => {
    const e = require('express');
    const config = require('../config.json');
    const s = require('./tokens.js');
    const records = require('../proxy/records.js');
    const apps = require('../apps/loader.js');
    const security = require('../security/interface.js');
    const analytics = require('../analytics/interface.js');
    const formidable = require('express-formidable');
    const fs = require('fs');
    const app = e();
    
    const errors = {
        404: fs.readFileSync('templates/error.html').toString().split('{{ code }}').join('404').split('{{ text }}').join('Page Not Found'),
        500: fs.readFileSync('templates/error.html').toString().split('{{ code }}').join('500').split('{{ text }}').join('Internal Server Error'),
        501: fs.readFileSync('templates/error.html').toString().split('{{ code }}').join('500').split('{{ text }}').join('Server Didn\'t Respond')
    }

    const { a } = require('../analytics/main.js');
    app.use('/api/v1/analytics', a);
    app.use(require('cookie-parser')());
    app.use('/assets', e.static('public'))

    app.get('/', (req, res) => {
        res.render('auth.ejs', { name: config.name });
    })

    app.get('/panel', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        res.render('panel.ejs', { acc, requests: analytics.getAllRequests(), pages: analytics.getAllPages(), security: security.getBots() });
    })

    app.get('/account', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        res.render('account.ejs', { acc, config });
    })

    app.get('/panel/c/:page', (req, res, next) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let sent = false;
        apps.apps.forEach(app => {
            let a = app.interface.getPages().find(x => x.url === '/'+req.params.page)
            if(!sent && a){
                res.render('custompage.ejs', { acc, app: a });
                sent = true
            }
        })

        if(!sent)next();
    })

    app.get('/panel/records', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        res.render('records.ejs', { acc, records: records.getRecords() });
    })

    app.get('/panel/apps', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        res.render('apps.ejs', { acc, apps: apps.apps });
    })

    app.get('/panel/logs', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');
        if(!acc.acc.config.isAdmin)return res.redirect('/panel');

        res.render('logs.ejs', { acc });
    })

    app.get('/panel/static', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        res.render('static.ejs', { acc, records: records.getStaticRecords() });
    })

    app.get('/panel/records/static', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.redirect('/panel/records');
        let record = records.getRecordByID(id);
        if(!record)return res.redirect('/panel/records');

        res.render('staticrec.ejs', { acc, record });
    })

    app.get('/panel/admin', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');
        if(!acc.acc.config.isAdmin)return res.redirect('/panel');

        res.render('admin.ejs', { acc });
    })

    app.get('/panel/analytics/byid', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.redirect('/panel/records');
        let record = records.getRecordByID(id);
        if(!record)return res.redirect('/panel/records');

        res.render('analytics.ejs', {
            acc, record,
            requests: analytics.getAllRequests().filter(x => x.host === record.host),
            pages: analytics.getAllPages().filter(x => x.host === record.host),
            security: security.getBots().filter(x => x.host === record.host)
        });
    })

    app.get('/panel/records/r', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.redirect('/panel/records');
        let record = records.getRecordByID(id);
        if(!record)return res.redirect('/panel/records');

        res.render('record.ejs', { acc, record });
    })

    app.get('/panel/records/new', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        res.render('newrecord.ejs', { acc, domains: records.domains.getDomains() });
    })

    app.get('/panel/apps/app', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id;
        if(!id)return res.redirect('/panel/apps');
        let app = apps.apps.find(x => x.id === id);
        if(!app)return res.redirect('/panel/apps');

        res.render('app.ejs', { acc, app });
    })

    app.get('/api/v1/static/files', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.json({ ok: false, msg: 'You fucked it, or... i did' });
        let record = records.getRecordByID(id);
        if(!record)return res.json({ ok: false, msg: 'You fucked it, or... i did' });

        try{
            let stat = fs.statSync('proxy/staticfiles/' + id + '/' + req.query.path);

            if(stat.isDirectory()){
                res.json(fs.readdirSync('proxy/staticfiles/' + id + '/' + req.query.path))
            } else{
                res.json({ isFile: true, contents: fs.readFileSync('proxy/staticfiles/' + id + '/' + req.query.path).toString() })
            }
        } catch(e){
            res.json({ ok: false });
            logger.error(e);
        }
    })

    app.get('/api/v1/logs', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        res.send(logger.get().split('\n').join('<br />'))
    })

    app.get('/api/v1/clearsessions', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');
        if(!acc.acc.config.isAdmin)return res.redirect('/panel');

        s.clear();
        res.json({ ok: true });
    })

    app.get('/api/v1/restart', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');
        if(!acc.acc.config.isAdmin)return res.redirect('/panel');

        res.json({ ok: true });
        process.send({ type: 'restart', acc });
    })

    app.get('/api/v1/reset', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');
        if(!acc.acc.config.isAdmin)return res.redirect('/panel');

        logger.clear();
        security.reset();
        analytics.reset();

        res.json({ ok: true });
    })

    app.delete('/api/v1/static/files', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.json({ ok: false, msg: 'You fucked it, or... i did' });
        let record = records.getRecordByID(id);
        if(!record)return res.json({ ok: false, msg: 'You fucked it, or... i did' });

        try{
            if(!req.query.path)return res.json({ ok: false });

            fs.rmSync('proxy/staticfiles/' + id + '/' + req.query.path, { recursive: true });
            res.json({ ok: true });
        } catch(e){
            res.json({ ok: false });
            logger.error(e);
        }
    })


    app.delete('/api/v1/logs', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        logger.clear();
        res.json({ ok: true });
    })

    app.delete('/api/v1/apps', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id;
        if(!id)return res.json({ ok: false });
        let app = apps.apps.find(x => x.id === id);
        if(!app)return res.json({ ok: false });

        app.disable();
        res.json({ ok: true });
    })

    app.delete('/api/v1/analytics', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');
        
        logger.warn('[PANEL] Resetting Analytics...');
        fs.writeFileSync('storage/analytics.json', '{}');

        analytics.reset();
        res.json({ ok: true });
    })

    app.delete('/api/v1/security', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');
        
        logger.warn('[PANEL] Resetting Security...');
        fs.writeFileSync('storage/security.json', '{}');

        security.reset();
        res.json({ ok: true });
    })

    app.delete('/api/v1/records', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.headers.id
        if(!id)return res.json({ ok: false, msg: 'You fucked it, or... i did' });
        let record = records.getRecordByID(id);
        if(!record)return res.json({ ok: false, msg: 'You fucked it, or... i did' });

        records.records.removeRecord(record.id);
        res.json({ ok: true });
    })

    app.put('/api/v1/static/newfile', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.json({ ok: false, msg: 'You fucked it, or... i did' });
        let record = records.getRecordByID(id);
        if(!record)return res.json({ ok: false, msg: 'You fucked it, or... i did' });

        try{
            fs.writeFileSync('proxy/staticfiles/' + id + '/' + req.query.path, '');
            res.json({ ok: true });
        } catch(e){
            logger.error(e);
            res.json({ ok: false });
        }
    })

    app.put('/api/v1/static/newfolder', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.json({ ok: false, msg: 'You fucked it, or... i did' });
        let record = records.getRecordByID(id);
        if(!record)return res.json({ ok: false, msg: 'You fucked it, or... i did' });

        try{
            fs.mkdirSync('proxy/staticfiles/' + id + '/' + req.query.path)
            res.json({ ok: true });
        } catch(e){
            logger.error(e);
            res.json({ ok: false });
        }
    })

    app.put('/api/v1/static/files', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.json({ ok: false, msg: 'You fucked it, or... i did' });
        let record = records.getRecordByID(id);
        if(!record)return res.json({ ok: false, msg: 'You fucked it, or... i did' });

        let data = '';

        req.on('data', ( chunk ) => data += chunk);
        req.on('end', () => {
            try{
                let stat = fs.statSync('proxy/staticfiles/' + id + '/' + req.query.path);
    
                if(stat.isDirectory()){
                    res.json({ ok: false })
                } else{
                    fs.writeFileSync('proxy/staticfiles/' + id + '/' + req.query.path, data)
                    res.json({ ok: true });
                }
            } catch(e){
                res.json({ ok: false });
                logger.error(e);
            }
        })
    })

    app.put('/api/v1/apps', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id;
        if(!id)return res.json({ ok: false });
        let app = apps.apps.find(x => x.id === id);
        if(!app)return res.json({ ok: false });

        app.enable();
        res.json({ ok: true });
    })

    app.put('/api/v1/records', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let data = '';

        req.on('data', ( chunk ) => {
            data += chunk;
        });

        req.on('end', () => {
            data = JSON.parse(data);
            if(!data.subdomain || !data.domain || !data.type)return res.json({ ok: false });
            if(data.type !== 'sta' && (!data.ip || !data.port))return res.json({ ok: false });

            if(data.type === 'sta'){
                records.records.createRecord(data.domain, data.subdomain, 'Static', 'Static', data.type === 'sta');
            } else{
                records.records.createRecord(data.domain, data.subdomain, data.ip, data.port, data.type === 'sta');
            }
            res.json({ ok: true });
        })
    })

    app.put('/api/v1/domains', (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        if(!req.headers.domain)return res.json({ ok: false, msg: 'Invaild Domain' });
        records.domains.addDomain(req.headers.domain);

        res.json({ ok: true });
    })

    app.post('/api/v1/static/files', formidable(), (req, res) => {
        let token = req.cookies._token;
        if(!token)return res.redirect('/');
        let acc = s.find(token);
        if(!acc)return res.redirect('/');

        let id = req.query.id
        if(!id)return res.json({ ok: false, msg: 'You fucked it, or... i did' });
        let record = records.getRecordByID(id);
        if(!record)return res.json({ ok: false, msg: 'You fucked it, or... i did' });

        try{
            fs.renameSync(req.files.file.path, 'proxy/staticfiles/' + id + '/' + req.query.path + '/' + req.files.file.name)

            res.json({ ok: true });
        } catch(e){
            res.json({ ok: false });
        }
    })

    app.post('/api/v1/auth', (req, res) => {
        let data = '';

        req.on('data', ( chunk ) => {
            data += chunk;
        });

        req.on('end', () => {
            data = JSON.parse(data);

            if(!data.username || !data.password)return res.json({ ok: false, msg: 'Incorrect Username Or Password' });
            let ac = config.accounts.find(acc => 
                acc.username === data.username &&
                acc.password === data.password
            )

            if(ac){
                let sus = new s.Session(ac);
                s.addSession(sus);

                res.cookie('_token', sus.token);
                res.json({ ok: true, url: '/panel' });
            } else{
                return res.json({ ok: false, msg: 'Incorrect Username Or Password' });
            }
        })
    })

    app.use((req, res) => {
        res.send(errors[404]);
    })

    app.listen(100);
}

module.exports = { run };