"use strict";

const express = require('express');
const winston = require('winston');
const client = require('prom-client');
const jsonfile = require('jsonfile');
const _ = require('underscore');
const collect = require("./lib/collect");
const k8s = require('kubernetes-client');

// Connecting to Kubernetees API
winston.info("Connecting to Kubernetees API ...");
const CLUSTER_IP = (process.env.CLUSTER_IP || '192.168.64.7');
const NAMESPACE = process.env.NAMESPACE || 'amq';
const TOKEN = process.env.TOKEN || 'FUNOo2PMZxtRe19lIfuT3GihuR3VXBehiVo3d9saYQw';

const core = new k8s.Core({
    "url": 'https://' + CLUSTER_IP + ':8443',
    "namespace": NAMESPACE,
    "auth": {
        "bearer": TOKEN
    }
});

const register = client.register;
const Gauge = client.Gauge;

const metrics_cache = {};

function collectMetrics(configuration) {
    winston.info("Collecting Metrics from AMQ Pods ...");
    collect(configuration, function (results) {
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

function searchAMQPodsAndCollect(err, result) {
    let brokersPodsNames = [];
    let pods = result.items;
    winston.info("Found %s pods", pods.length);
    winston.info("Looking for AMQ Pods ...");
    _.each(pods, function (pod) {
        let ports = pod.spec.containers[0].ports;
        if (ports) {
            _.each(ports, function (port) {
                if (port.name === "tcp" && port.containerPort === 61616) {
                    winston.info("Found a new AMQ broker with name %s", pod.metadata.name);
                    brokersPodsNames.push(pod.metadata.name);
                }
            });
        }
    });

    let configuration = {
        "master": CLUSTER_IP,
        "token": TOKEN,
        "namespaces": [
            {
                "name": NAMESPACE,
                "pods": brokersPodsNames
            }
        ]
    };
    collectMetrics(configuration);
}

let app = express();

app.get('/metrics', function (req, res) {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
});

setInterval(() => {
    core.namespaces.po.get(searchAMQPodsAndCollect);
}, 10000);

client.collectDefaultMetrics();

app.listen(process.env.OPENSHIFT_NODEJS_PORT || 8080);
