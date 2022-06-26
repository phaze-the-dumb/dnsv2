const fs = require('fs');

let run = ( logger ) => {
    setInterval(() => {
        logger.info('[STORAGE] Checking For Fucky Wuckies');
    
        let a = fs.statSync(__dirname+'/analytics.json');
        if(a.size > 10 * 1024 * 1024){
            logger.warn('[STORAGE] FUCKY WUCKY DETECTED, Deleting Contents of analytics.json, THIS MAY CAUSE ISSUES');
            fs.writeFileSync(__dirname+'/analytics.json', '{}');
        };

        let s = fs.statSync(__dirname+'/security.json');
        if(s.size > 10 * 1024 * 1024){
            logger.warn('[STORAGE] FUCKY WUCKY DETECTED, Deleting Contents of security.json, THIS MAY CAUSE ISSUES');
            fs.writeFileSync(__dirname+'/security.json', '{}');
        };
    }, 600000);
}

let getSizes = () => {
    let obj = {};
    fs.readdirSync(__dirname).forEach(f => {
        if(f.endsWith('.json')){
            obj[f] = fs.statSync(__dirname+'/'+f).size;
        }
    })

    return obj;
}

module.exports = { getSizes, run };