"use strict";

module.exports = [
    {
        "id": "health",
        "description": "Health Metrics",
        "objectName": "org.apache.activemq:type=Broker,brokerName=*,service=Health",
        "attributes": [{
            "name": "CurrentStatus", "fn": function (value) {
                if (value === "Good") {
                    return 1;
                }
                return 0;
            }
        }],
        "metadatas": ["broker_name", "service"]
    },
    {
        "id": "brokers",
        "description": "Brokers Metrics",
        "objectName": "org.apache.activemq:type=Broker,brokerName=*",
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
            "MemoryLimit",
            "MinMessageSize",
            "TotalEnqueueCount",
            "TempLimit",
            "JobSchedulerStoreLimit",
            "StorePercentUsage",
            "MaxMessageSize"
        ],
        "metadatas": ["broker_name"]
    },
    {
        "id": "queues",
        "description": "Queues Metrics",
        "objectName": "org.apache.activemq:type=Broker,brokerName=*,destinationType=Queue,destinationName=*",
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
            "ProducerFlowControl",
            "CursorFull"
        ],
        "metadatas": ["broker_name", "destination_name", "destination_type"]
    },
    {
        "id": "topics",
        "description": "Topics Metrics",
        "objectName": "org.apache.activemq:type=Broker,brokerName=*,destinationType=Topic,destinationName=*",
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
            "Subscriptions"
        ],
        "metadatas": ["broker_name", "destination_name", "destination_type"]
    },
    {
        "id": "persistence",
        "description": "Persistence Metrics",
        "objectName": "org.apache.activemq:type=Broker,brokerName=*,service=PersistenceAdapter,instanceName=KahaDBPersistenceAdapter*",
        "attributes": ["Size", "Transactions"],
        "metadatas": ["broker_name", "service", "instance_name"]
    },
    {
        "id": "classloading",
        "description": "ClassLoading Metrics",
        "objectName": "java.lang:type=ClassLoading",
        "attributes": [
            "LoadedClassCount",
            "UnloadedClassCount",
            "TotalLoadedClassCount"
        ]
    },
    {
        "id": "threading",
        "description": "Threading Metrics",
        "objectName": "java.lang:type=Threading",
        "attributes": [
            "TotalStartedThreadCount",
            "CurrentThreadUserTime",
            "PeakThreadCount",
            "CurrentThreadCpuTime",
            "ThreadCount",
            "DaemonThreadCount"
        ]
    },
    {
        "id": "os",
        "description": "OperatingSystem Metrics",
        "objectName": "java.lang:type=OperatingSystem",
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
            "AvailableProcessors"
        ]
    },
    {
        "id": "nonheapusage",
        "description": "NonHeapMemoryUsage Metrics",
        "objectName": "java.lang:type=Memory/NonHeapMemoryUsage",
        "attributes": [
            "init",
            "committed",
            "max",
            "used"
        ]
    },
    {
        "id": "heapusage",
        "description": "HeapMemoryUsage Metrics",
        "objectName": "java.lang:type=Memory/HeapMemoryUsage",
        "attributes": [
            "init",
            "committed",
            "max",
            "used"
        ]
    }
];
