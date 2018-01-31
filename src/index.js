"use strict";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const winston = require('winston');
const _ = require('underscore');
const k8s = require('kubernetes-client');
const client = require('prom-client');
const register = client.register;

// Connecting to Kubernetees API
const IN_CLUSTER = process.env.IN_CLUSTER === "true";
const CLUSTER_IP = process.env.CLUSTER_IP || process.env.KUBERNETES_SERVICE_HOST;
const CLUSTER_PORT = process.env.CLUSTER_PORT || process.env.KUBERNETES_PORT_443_TCP_PORT;
const NAMESPACE = process.env.NAMESPACE || 'amq';
const TOKEN = process.env.TOKEN;

winston.info("IN_CLUSTER=%s, CLUSTER_IP=%s, CLUSTER_PORT=%s, NAMESPACE=%s, TOKEN=%s", IN_CLUSTER, CLUSTER_IP, CLUSTER_PORT, NAMESPACE, TOKEN);

if (!TOKEN) {
    throw new Error("Please provide an authentication token");
}

let core;
if (IN_CLUSTER) {
    winston.info("Using incluster connection ...");
    core = new k8s.Core(k8s.config.getInCluster());
} else {
    winston.info("Using a remote connection ...");

    core = new k8s.Core({
        "url": 'https://' + CLUSTER_IP + ':8443',
        "namespace": NAMESPACE,
        "auth": {
            "bearer": TOKEN
        }
    });
}

// Connecting to Kubernetees API
const domains = [];
const manifest = require("./lib/metrics/amq/manifest");
_.each(manifest, function (domain) {
    domains.push(require("./lib/metrics/amq/index")(client, register, domain));
});

function updateAllMetrics() {
    core.namespaces.po.get(function (error, result) {
        if (error) {
            winston.error("Unable to list all pods due to : %s", error);
            return;
        }

        let brokersPodsNames = [];
        let brokersPodsIps = [];
        let pods = result.items;
        winston.info("Found %s pods", pods.length);
        winston.info("Looking for AMQ Pods ...");
        _.each(pods, function (pod) {
            let ports = pod.spec.containers[0].ports;
            if (ports) {
                _.each(ports, function (port) {
                    if (port.name === "tcp" && port.containerPort === 61616 && pod.status.phase === "Running") {
                        winston.info("Found a new AMQ broker with name %s", pod.metadata.name);
                        brokersPodsNames.push(pod.metadata.name);
                        brokersPodsIps.push(pod.status.podIP);
                    }
                });
            }
        });

        let configuration = {
            "master": CLUSTER_IP,
            "token": TOKEN,
            "port": CLUSTER_PORT,
            "namespaces": [
                {
                    "name": NAMESPACE,
                    "pods": brokersPodsNames
                }
            ]
        };

        domains.forEach(domain => domain(configuration));
    })
}

updateAllMetrics();

const COLLECT_PERIOD = process.env.COLLECT_PERIOD_SECONDS ? process.env.COLLECT_PERIOD_SECONDS * 1000 : 10000;
winston.info("Setup metrics collection to %s seconds", COLLECT_PERIOD / 1000);
setInterval(
    updateAllMetrics,
    COLLECT_PERIOD
).unref();

let app = express();

app.get('/metrics', function (request, response) {
    response.set('Content-Type', register.contentType);
    response.end(register.metrics());
});

app.get('/health', function (req, res) {
    res.end("OK");
});

const PORT = process.env.OPENSHIFT_NODEJS_PORT || 8080;
app.listen(PORT, function () {
    winston.info("Server started and listening to requests in port : " + PORT);
    winston.info("Provided routes are : ");
    winston.info("- health[GET] : Used for liveness probe");
    winston.info("- metrics[GET] : Used for prometheus metrics exporter");
});
