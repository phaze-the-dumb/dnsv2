const fs = require('fs');
let s = require('./panel/tokens.js');
let log = '';
let update = false;

const logger = {
    info: (...logs) => {
        let d = new Date();

        logs.forEach(l => {
            log += '['+d.getDate()+'/'+d.getMonth()+'/'+d.getFullYear()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+'] [I] '+l+'\n'
        })

        update = true;
    },
    warn: (...logs) => {
        let d = new Date();

        logs.forEach(l => {
            log += '['+d.getDate()+'/'+d.getMonth()+'/'+d.getFullYear()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+'] [W] '+l+'\n'
        })

        update = true;
    },
    error: (...logs) => {
        let d = new Date();

        logs.forEach(l => {
            log += '['+d.getDate()+'/'+d.getMonth()+'/'+d.getFullYear()+' '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+'] [E] '+l+'\n'
        })

        update = true;
    },
    get: () => {
        return log;
    },
    clear: () => {
        log = '';
    }
}

setInterval(() => {
    if(update){
        process.stdout.write(log)
        fs.writeFileSync(__dirname+'/latest.log', log);
        update = false;
    }
}, 1000)

global.logger = logger

// Error Catcher
let errors = [];
let getErrors = () => errors;

process.on('uncaughtException', ( err ) => {
    console.error(err);
    errors.push(err);
    logger.error(err);
})

// Start Files
require('./proxy/main.js').run(logger);
require('./panel/main.js').run(getErrors, logger);
require('./storage/manager.js').run(logger);
require('./apps/loader.js').run(logger);

// Child / Parent shit

process.on('message', ( msg ) => {
    if(msg.type === 'addToken'){
        s.addSession(msg.acc)
    }
})