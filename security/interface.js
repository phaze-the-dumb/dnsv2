const main = require('./main.js');
let data = main.data;

let getBots = () => data.bots;
let reset = () => main.data = {"bots":[]};

module.exports = { getBots, reset };