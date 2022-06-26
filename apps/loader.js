const { randomUUID } = require('crypto');

const fs = require('fs');
if(!fs.existsSync('apps/files'))fs.mkdirSync('apps/files');

let apps = [];

let run = ( logger ) => {
    const fs = require('fs');
    const vm = require('vm');
    const { spawn } = require('child_process');
    const config = require('../config.json');
    const Interface = require('./interface.js');

    let thisPackage = JSON.parse(fs.readFileSync('package.json'));

    class App{
        constructor(dir, app){
            this.deps = [];
            this.dir = dir + '/' + app;
            this.routes = [];
            this.id = randomUUID();

            this.disable = () => {
                this.package.enabled = false;
                fs.writeFileSync(dir + '/' + app + '/package.json', JSON.stringify(this.package));
            }

            this.enable = () => {
                this.package.enabled = true;
                fs.writeFileSync(dir + '/' + app + '/package.json', JSON.stringify(this.package));
            }

            try{
                let packageJSON = JSON.parse(fs.readFileSync(dir + '/' + app + '/package.json'));
                if(apps.find(x => x.name === packageJSON.name))return logger.warn('[APPLOADER] Skipping '+packageJSON.name+' Already Loaded App With Same Name.');

                this.originPackage = { enabled: packageJSON.enabled };
                this.package = packageJSON;
                this.name = this.package.name || this.app;

                logger.info('[APPLOADER] Loading App '+packageJSON.name);

                Object.keys(packageJSON.dependencies).forEach((key, i) => {
                    if(!thisPackage.dependencies[key]){
                        logger.warn('[APPLOADER] '+key+' Not Found, Installing Latest Version Of NPM');
                        let install = spawn('npm', [ 'i', key ]);

                        install.on('close', code => {
                            logger.info('[APPLOADER] '+key+' Finished Installing With Code: '+code);
                            thisPackage = JSON.parse(fs.readFileSync('package.json'));

                            this.deps.push({ name: key, version: thisPackage.dependencies[key] });

                            if(i === Object.keys(packageJSON.dependencies).length - 1){
                                this.loadApp()
                            }
                        })
                    } else{
                        this.deps.push({ name: key, version: thisPackage.dependencies[key] });

                        if(i === Object.keys(packageJSON.dependencies).length - 1){
                            this.loadApp()
                        }
                    }
                })

                if(Object.keys(packageJSON.dependencies).length === 0){
                    this.loadApp();
                }
            } catch(e){
                logger.warn('[APPLOADER] Failed To Load: '+app+'\n'+e);
            }
        }
        loadApp(){
            if(this.package.enabled === false)return logger.info('[APPLOADER] Skipping '+this.package.name+' App Is Disabled');

            let apiInterface = new Interface(this, logger);
            vm.createContext(apiInterface);

            this.vm = vm.runInContext(fs.readFileSync(this.dir + '/' + this.package.main), apiInterface);
            logger.info('[APPLOADER] Loaded App: '+this.package.name);

            this.interface = apiInterface;
        }
    }

    fs.readdirSync(config.appsDir).forEach(app => {
        apps.push(new App(config.appsDir, app))
    })
}

module.exports = { run, apps };