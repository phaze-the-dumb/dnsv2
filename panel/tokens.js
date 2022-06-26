const { randomUUID } = require('crypto');

let sessions = [];
class Session{
    constructor(acc){
        this.acc = acc;
        this.token = randomUUID() + randomUUID() + randomUUID() + randomUUID() + randomUUID() + randomUUID()
    }
}

let getSessions = () => sessions;
let setSessions = ( s ) => sessions = s;
let addSession = ( s ) => sessions.push(s);
let find = ( token ) => sessions.find(x => x.token === token);
let clear = () => sessions = [];

module.exports = { getSessions, setSessions, addSession, find, Session, clear };