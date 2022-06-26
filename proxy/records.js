let records = require('../storage/records.json');
let domains = require('../storage/domains.json');
let tmpRecords = [];

const fs = require('fs');
const { randomUUID } = require('crypto');

const defaultPage = fs.readFileSync('templates/default.html');

// Domains
let getDomains = () => { return domains };
let addDomain = ( domain ) => {
    domains.push(domain);
    fs.writeFileSync('storage/domains.json', JSON.stringify(domains));
}
let removeDomain = ( domain ) => {
    domains = domains.filter(x => x !== domain);
    fs.writeFileSync('storage/domains.json', JSON.stringify(domains));
}

// Records
let getRecords = () => { return records };
let createRecord = ( domain, subdomain, ip, port, static ) => {
    let id = randomUUID();
    let data = {
        host: subdomain + '.' + domain,
        ip, port, id: randomUUID(), tmp: false,
        static, id
    }

    if(subdomain === '@')data.host = domain;
    records.push(data);

    if(static){
        fs.mkdirSync('proxy/staticfiles/'+id);
        fs.writeFileSync('proxy/staticfiles/'+id+'/index.html', defaultPage);
    }

    fs.writeFileSync('storage/records.json', JSON.stringify(records));
    return data;
}
let removeRecord = ( id ) => {
    let r = records.find(x => x.id === id);
    if(r.static){
        fs.rmSync('proxy/staticfiles/'+id, { recursive: true });
    }

    records = records.filter(x => x.id !== id);
    fs.writeFileSync('storage/records.json', JSON.stringify(records));
}

// TMP Records
let registerTMPRecord = ( domain, subdomain, app, cb ) => {
    let id = randomUUID();
    let data = {
        host: subdomain + '.' + domain,
        cb, app, id,
        remove: () => {
            tmpRecords = tmpRecords.filter(x => x.id !== id);
            return tmpRecords
        },
        tmp: true
    }

    if(subdomain === '@')data.host = domain;
    tmpRecords.push(data);

    return data;
}

// All Records
let getRecordByID = ( id ) => {
    let rec = records.find(x => x.id === id);
    if(!rec)rec = tmpRecords.find(x => x.id === id);

    return rec;
}
let getRecord = ( host ) => {
    let rec = records.find(x => x.host === host);
    if(!rec)rec = tmpRecords.find(x => x.host === host);

    return rec;
}
let getAllRecords = () => {
    return [ ...records, ...tmpRecords ];
}
let getStaticRecords = () => {
    let recs = [];
    records.forEach(r => { if(!r.tmp && r.static)recs.push(r) });

    return recs;
}

module.exports = {
    domains: { getDomains, addDomain, removeDomain },
    records: { getRecords, createRecord, removeRecord },
    registerTMPRecord, getRecord, getRecords: getAllRecords,
    getRecordByID, getStaticRecords
}