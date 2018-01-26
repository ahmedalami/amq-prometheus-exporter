"use strict";

const express = require('express');
const client = require('prom-client');
const jsonfile = require('jsonfile');
const _ = require('underscore');
const collect = require("./lib/collect");

let app = express();

const register = client.register;
const Gauge = client.Gauge;

const metrics_cache = {};

function collectMetrics(config) {
    collect(jsonfile.readFileSync(__dirname + "/config/" + config + ".json"), function (results) {
        _.each(results, function (result) {
            let metrics = _.each(result.metrics, function (metric) {
                _.each(_.keys(metric), function (key) {
                    let name = ["amq", result.domain, key.toLowerCase()].join("_");

                    if (metric[key] && typeof metric[key] === "number") {

                        metrics_cache[name] = metrics_cache[name] || new Gauge({
                            "name": name,
                            "help": key,
                            "labelNames": ["domain", "namespace", "pod"]
                        });

                        metrics_cache[name].set({
                            "domain": result.domain,
                            "namespace": result.namespace,
                            "pod": result.pod,
                        }, metric[key]);
                    }
                });
            });
        });
    });
}

app.get('/metrics', function (req, res) {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
});

setInterval(() => {
    collectMetrics("performance-code-matching");
}, 2000);

client.collectDefaultMetrics();

app.listen(3000);
