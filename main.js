const cp = require('child_process');
console.log('(SHELL) LOADED, LOADING APPLICATION...');

let runChild = () => {
    const controller = new AbortController();
    let child = cp.fork('index.js', [], { signal: controller.signal });

    child.on('spawn', () => {
        console.log('(SHELL) APPLICATION STARTED...');
    })

    child.on('message', ( msg ) => {
        if(msg.type === 'restart'){
            console.log('(SHELL) RESTARTING APPLICATION...');
            controller.abort();

            setTimeout(() => {
                console.log('(SHELL) STARTING APPLICATION...');
                let c = runChild();

                setTimeout(() => {
                    c.send({ type: 'addToken', acc: msg.acc })
                }, 250)
            }, 500);
        }
    })

    child.on('error', ( err ) => {
        console.error(err);
    })

    return child;
}

runChild();