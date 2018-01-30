"use strict";

const winston = require("winston");
const async = require("async");
const unirest = require("unirest");
const _ = require("underscore");

const lib = require("./lib");

const LIMIT = 5;
const DEFAULT_LABELS = ["pod", "namespace", "domain"];

function getGaugeName(attribute, config) {
    return "amq_broker_" + config.id + "_" + (attribute.name || attribute).toLowerCase();
}

module.exports = (client, register, config) => {
    const Gauge = client.Gauge;
    const registers = register ? [register] : undefined;
    const gauges = {};

    config.attributes.forEach(attribute => {
        gauges[(attribute.name || attribute).toLowerCase()] = new Gauge({
            "name": getGaugeName(attribute, config),
            "help": config.description + " " + (attribute.name || attribute),
            "labelNames": (config.metadatas || []).concat(DEFAULT_LABELS),
            registers
        });
    });

    return (configuration) => {
        winston.info("Collection metrics for domain %s", config.id);

        let commands = [];
        _.each(configuration.namespaces, function (namespace) {
            _.each(namespace.pods, function (pod) {
                commands.push({
                    "pod": pod,
                    "namespace": namespace.name,
                    "domain": config.id
                });
            });
        });

        async.concatLimit(
            commands,
            LIMIT,
            function (command, done) {
                let url = lib.getUrl(configuration.master, configuration.port, command.namespace, command.pod, config.objectName);
                unirest
                    .get(url)
                    .headers({"Authorization": "Bearer " + configuration.token})
                    .end(function (response) {
                        let value = JSON.parse(response.body).value;
                        let metrics = lib.extractMetrics(value, config);
                        done(null, {command, metrics});
                    });
            },
            function (error, results) {
                results.forEach(result => {
                    let metrics = result.metrics;
                    let command = result.command;

                    metrics.forEach(metric => {
                        config.attributes.forEach(attribute => {
                            let metadatas = {
                                "namespace": command.namespace,
                                "pod": command.pod,
                                "domain": command.id
                            };

                            (config.metadatas || []).forEach(meta => {
                                metadatas[meta] = metric[meta];
                            });

                            let value = metric[attribute.name || attribute];

                            if (typeof value === "boolean") {
                                value = value ? 1 : 0;
                            }

                            if (typeof value === "string" && value.indexOf("[") === 0) {
                                value = JSON.parse(value.length);
                            }

                            if (typeof value === "object" && Array.isArray(value)) {
                                value = value.length;
                            }

                            if (value) {
                                gauges[(attribute.name || attribute).toLowerCase()].set(metadatas, value, Date.now());
                            }
                        });
                    });
                });
            }
        );
    }
};