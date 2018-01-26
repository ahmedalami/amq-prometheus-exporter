#!/usr/bin/env node

const program = require('commander');
const jsonfile = require('jsonfile');
const collect = require('../lib/collect');

program
    .version('0.1.0')
    .usage('[options]')
    .option('-c, --config <a>', 'Set the configuration')
    .parse(process.argv);

let config = jsonfile.readFileSync(__dirname + "/config/" + program.config + ".json");
collect(config);
