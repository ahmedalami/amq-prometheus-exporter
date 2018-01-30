"use strict";

// Accept self signed certificate in certificate chain
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const async = require("async");
const _ = require("underscore");
const unirest = require("unirest");
const elasticsearch = require('elasticsearch');
const mkdirp = require('mkdirp');
const json2csv = require('json2csv');
const string = require('string');
const fs = require('fs');

const DATA_DIR = __dirname + "/../../data";

const LIMIT = 5;

const OBJECT_NAMES_DOMAINS = {
    "brokers": {
        "name": "org.apache.activemq:type=Broker,brokerName=*",
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
        ],
        "discriminant": "broker_name"
    },
    "queues": {
        "name": "org.apache.activemq:type=Broker,brokerName=*,destinationType=Queue,destinationName=*",
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
            "ProducerFlowControl",
            "CursorFull"
        ],
        "discriminant": "destination_name"
    },
    "topics": {
        "name": "org.apache.activemq:type=Broker,brokerName=*,destinationType=Topic,destinationName=*",
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
            "Subscriptions"
        ],
        "discriminant": "destination_name"
    },
    "persistence": {
        "name": "org.apache.activemq:type=Broker,brokerName=*,service=PersistenceAdapter,instanceName=KahaDBPersistenceAdapter*",
        "attributes": ["Size", "Transactions"],
        "discriminant": "broker_name"
    },
    "health": {
        "name": "org.apache.activemq:type=Broker,brokerName=*,service=Health",
        "attributes": [{
            "name": "CurrentStatus", "fn": function (value) {
                if (value === "Good") {
                    return 1;
                }
                return 0;
            }
        }],
        "discriminant": "broker_name"
    },
    "classloading": {
        "name": "java.lang:type=ClassLoading",
        "attributes": [
            "LoadedClassCount",
            "UnloadedClassCount",
            "TotalLoadedClassCount"
        ]
    },
    "compilation": {
        "name": "java.lang:type=Compilation",
        "attributes": [
            "TotalCompilationTime"
        ]
    },
    "heapusage": {
        "name": "java.lang:type=Memory/HeapMemoryUsage",
        "attributes": [
            "init",
            "committed",
            "max",
            "used"
        ]
    },
    "nonheapusage": {
        "name": "java.lang:type=Memory/NonHeapMemoryUsage",
        "attributes": [
            "init",
            "committed",
            "max",
            "used"
        ]
    },
    "os": {
        "name": "java.lang:type=OperatingSystem",
        "attributes": [
            "OpenFileDescriptorCount",
            "CommittedVirtualMemorySize",
            "FreePhysicalMemorySize",
            "SystemLoadAverage",
            "ProcessCpuLoad",
            "FreeSwapSpaceSize",
            "TotalPhysicalMemorySize",
            "TotalSwapSpaceSize",
            "ProcessCpuTime",
            "MaxFileDescriptorCount",
            "SystemCpuLoad",
            "Version",
            "AvailableProcessors"
        ]
    },
    "threading": {
        "name": "java.lang:type=Threading",
        "attributes": [
            "TotalStartedThreadCount",
            "CurrentThreadUserTime",
            "PeakThreadCount",
            "CurrentThreadCpuTime",
            "ThreadCount",
            "DaemonThreadCount"
        ]
    }
};

const DEFAULT_METRICS_DOMAINS = ["queues"] || _.keys(OBJECT_NAMES_DOMAINS);

function getUrl(command) {
    return command.namespace + "/pods/https:" + command.pod + ":8778/proxy/jolokia" + "/read/" + OBJECT_NAMES_DOMAINS[command.domain].name;
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
                });
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
                mkdirp.sync(DATA_DIR);
                _.each(results, function (result) {
                    fs.appendFileSync(DATA_DIR + "/" + result.domain + ".log", JSON.stringify(result) + "\n");
                });
            }
        });
};
