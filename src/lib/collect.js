"use strict";

// Accept self signed certificate in certificate chain
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const async = require("async");
const _ = require("underscore");
const unirest = require("unirest");
const elasticsearch = require('elasticsearch');
const mkdirp = require('mkdirp');
const json2csv = require('json2csv');
const fs = require('fs');

const DATA_DIR = __dirname + "/../../data";

mkdirp.sync(DATA_DIR);

const LIMIT = 5;

const DEFAULT_FUNCTION = function (response, domain) {
    let me = this;
    let items = [];
    _.each(_.keys(response), function (key) {
        let item = {
            "objetName": key
        };

        _.each(domain.attributes, function (attribute) {
            item[attribute] = response[key][attribute];
        });

        items.push(item);
    });

    return items;
};

const DEFAULT_METRICS_DOMAINS = ["brokers", "queues", "topics", "persistence"];
const OBJECT_NAMES_DOMAINS = {
    "brokers": {
        "name": "type=Broker,brokerName=*",
        "attributes": [
            "TotalMessageCount",
            "TotalConnectionsCount",
            "TempPercentUsage",
            "MemoryPercentUsage",
            "StoreLimit",
            "TotalProducerCount",
            "CurrentConnectionsCount",
            "TotalDequeueCount",
            "JobSchedulerStorePercentUsage",
            "AverageMessageSize",
            "BrokerName",
            "MemoryLimit",
            "MinMessageSize",
            "TotalEnqueueCount",
            "TempLimit",
            "JobSchedulerStoreLimit",
            "StorePercentUsage",
            "MaxMessageSize"
        ]
    },
    "queues": {
        "name": "type=Broker,brokerName=*,destinationType=Queue,destinationName=*",
        "attributes": [
            "MemoryUsageByteCount",
            "AverageBlockedTime",
            "MemoryPercentUsage",
            "CursorMemoryUsage",
            "InFlightCount",
            "ForwardCount",
            "AverageEnqueueTime",
            "TotalBlockedTime",
            "QueueSize",
            "MaxPageSize",
            "MemoryUsagePortion",
            "Paused",
            "EnqueueCount",
            "ConsumerCount",
            "AverageMessageSize",
            "ExpiredCount",
            "MaxProducersToAudit",
            "CursorPercentUsage",
            "MinEnqueueTime",
            "MemoryLimit",
            "MinMessageSize",
            "DispatchCount",
            "MaxEnqueueTime",
            "DequeueCount",
            "ProducerCount",
            "MaxMessageSize",
            "Name",
        ]
    },
    "topics": {
        "name": "type=Broker,brokerName=*,destinationType=Topic,destinationName=*",
        "attributes": [
            "MemoryUsageByteCount",
            "AverageBlockedTime",
            "MemoryPercentUsage",
            "InFlightCount",
            "ForwardCount",
            "AverageEnqueueTime",
            "TotalBlockedTime",
            "BlockedSends",
            "QueueSize",
            "MaxPageSize",
            "MemoryUsagePortion",
            "Paused",
            "EnqueueCount",
            "ConsumerCount",
            "AverageMessageSize",
            "ExpiredCount",
            "MaxProducersToAudit",
            "CursorPercentUsage",
            "MinEnqueueTime",
            "MemoryLimit",
            "MinMessageSize",
            "DispatchCount",
            "MaxEnqueueTime",
            "DequeueCount",
            "ProducerCount",
            "MaxMessageSize",
            "Name",
        ]
    },
    "persistence": {
        "name": "type=Broker,brokerName=*,service=PersistenceAdapter,instanceName=KahaDBPersistenceAdapter*",
        "attributes": ["Size"]
    }
};

function getUrl(command) {
    return command.namespace + "/pods/https:" + command.pod + ":8778/proxy/jolokia" + "/read/org.apache.activemq:" + OBJECT_NAMES_DOMAINS[command.domain].name;
}

module.exports = function (configuration, callback) {

    let commands = [];

    _.each(DEFAULT_METRICS_DOMAINS, function (domain) {
        _.each(configuration.namespaces, function (namespace) {
            _.each(namespace.pods, function (pod) {
                commands.push({
                    "pod": pod,
                    "namespace": namespace.name,
                    "domain": domain
                })
            });
        });
    });

    let baseURl = "https://" + (configuration.master || "localhost" ) + ":" + (configuration.port || 8443) + "/api/v1/namespaces/";

    async.concatLimit(commands, LIMIT,
        function (command, done) {
            let url = baseURl + getUrl(command);

            unirest.get(url)
                .headers({"Authorization": "Bearer " + configuration.token})
                .end(function (response) {
                    let value = JSON.parse(response.body).value;
                    let metrics = (OBJECT_NAMES_DOMAINS[command.domain].fn || DEFAULT_FUNCTION)(value, OBJECT_NAMES_DOMAINS[command.domain]);

                    done(null, {
                        "@timestamp": new Date(),
                        "namespace": command.namespace,
                        "pod": command.pod,
                        "domain": command.domain,
                        metrics
                    });
                });

        }, function (error, results) {
            if (callback) {
                callback(results);
            } else {
                _.each(results, function (result) {
                    fs.appendFileSync(DATA_DIR + "/" + result.domain + ".log", JSON.stringify(result) + "\n");
                });
            }
        });
};
