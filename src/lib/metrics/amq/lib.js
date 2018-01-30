"use strict";

const _ = require("underscore");
const string = require("string");

/**
 *
 * @param masterIP
 * @param masterPort
 * @param namespace
 * @param pod
 * @param objectName
 * @returns {string}
 */
function getUrl(masterIP, masterPort, namespace, pod, objectName) {
    return "https://" + (masterIP || "localhost" ) + ":" + (masterPort || 8443) + "/api/v1/namespaces/" + namespace + "/pods/https:" + pod + ":8778/proxy/jolokia" + "/read/" + objectName;
}

/**
 *
 * @param response
 * @param domain
 * @returns {Array}
 */
function extractMetrics(response, domain) {
    let me = this;
    let items = [];

    if (domain.objectName.indexOf("*") !== -1) {
        _.each(_.keys(response), function (key) {
            let item = {
                "objet_name": key
            };
            let parts = key.split(",");
            _.each(parts, function (part) {
                let name = part.split("=")[0];
                if (name.indexOf(":") !== -1) {
                    name = name.split(":")[1];
                }

                item[string(name).underscore().s] = part.split("=")[1];
            });

            _.each(domain.attributes, function (attribute) {
                if (attribute.name && attribute.fn) {
                    item[attribute.name] = attribute.fn(response[key][attribute.name]);
                } else {
                    item[attribute] = response[key][attribute];
                }
            });

            items.push(item);
        });
    } else {
        let item = {
            "objet_name": response.ObjectName ? response.ObjectName.objectName : domain.name
        };
        _.each(domain.attributes, function (attribute) {
            if (attribute.name && attribute.fn) {
                item[attribute.name] = attribute.fn(response[attribute.name]);
            } else {
                item[attribute] = response[attribute];
            }
        });

        items.push(item);
    }

    return items;
}

module.exports = {
    getUrl: getUrl,
    extractMetrics: extractMetrics
};
