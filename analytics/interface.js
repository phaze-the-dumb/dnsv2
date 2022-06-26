const c = require('./couters.js');
let data = c.data;

let getRequestById = ( id ) => data.requests.find(x => x.id === id);
let getRequestByIp = ( ip ) => data.requests.filter(x => x.ip === ip);
let getAllRequests = () => data.requests;

let getPagesById = ( id ) => data.pages.find(x => x.id === id);
let getPagesByIp = ( ip ) => data.pages.filter(x => x.ip === ip);
let getAllPages = () => data.pages;

let reset = () => c.data = {"requests":[],"unique":[],"real":[],"country":[],"pages":[]}

module.exports = { getAllPages, getAllRequests, getPagesById, getPagesByIp, getRequestById, getRequestByIp, reset };