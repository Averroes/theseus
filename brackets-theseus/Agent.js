/*
 * Copyright (c) 2012 Adobe Systems Incorporated and other contributors.
 * All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */

/**
 * Your connection to instrumented node code.
 *
 * Provides these events:
 *
 *   - receivedScriptInfo (path):
 *       when information about functions and call sites has been received
 *   - scriptWentAway (path):
 *       when the connection to the instance for a particular path has closed
 */

define(function (require, exports, module) {
    var NodeAgent = require("Agent-node");
    var ChromeAgent = require("Agent-chrome");
    var ProjectManager = brackets.getModule("project/ProjectManager");
    var $exports = $(exports);

    function init() {
        NodeAgent.init();
        ChromeAgent.init();

        $(NodeAgent).on("receivedScriptInfo", function (ev, path) {
            $exports.triggerHandler("receivedScriptInfo", path);
        });
        $(NodeAgent).on("scriptWentAway", function (ev, path) {
            $exports.triggerHandler("scriptWentAway", path);
        });

        $(ChromeAgent).on("receivedScriptInfo", function (ev, path) {
            console.log("chrome got script", path);
            $exports.triggerHandler("receivedScriptInfo", path);
        });
        $(ChromeAgent).on("scriptWentAway", function (ev, path) {
            console.log("chrome lost script", path);
            $exports.triggerHandler("scriptWentAway", path);
        });
    }

    function isReady() {
        return ChromeAgent.isReady() || NodeAgent.isReady();
    }

    function possibleRemotePathsForLocalPath(path) {
        var relativePath = ProjectManager.makeProjectRelativeIfPossible(path);
        var pathComponents = relativePath.split("/");
        return [
            path,
            relativePath,
            "assets/" + pathComponents[pathComponents.length - 1],
            "assets/" + relativePath.replace(/^app\/assets\/[^\/]+\//, ''),
            relativePath.replace(/^public\//, ''),
        ];
    }

    function couldBeRemotePath(localPath, remotePath) {
        return possibleRemotePathsForLocalPath(localPath).indexOf(remotePath) !== -1;
    }

    function functionWithId(fid) {
        return NodeAgent.functionWithId(fid);
    }

    function functionsInFile(path) {
        var functions = [];
        functions.push.apply(functions, NodeAgent.functionsInFile(path));
        functions.push.apply(functions, ChromeAgent.functionsInFile(path));
        return functions;
    }

    function refreshHitCounts(callback) {
        NodeAgent.refreshHitCounts(function (nodeHits, nodeDeltas) {
            ChromeAgent.refreshHitCounts(function (chromeHits, chromeDeltas) {
                var hits = {};
                var deltas = {};
                if (nodeHits) {
                    for (var i in nodeHits) { hits[i] = nodeHits[i] }
                    for (var i in nodeDeltas) { deltas[i] = nodeDeltas[i] }
                }
                if (chromeHits) {
                    for (var i in chromeHits) { hits[i] = chromeHits[i] }
                    for (var i in chromeDeltas) { deltas[i] = chromeDeltas[i] }
                }
                if (nodeHits || chromeHits) {
                    callback(hits, deltas);
                } else {
                    callback();
                }
            });
        });
    }

    function cachedHitCounts() {
        return NodeAgent.cachedHitCounts();
    }

    function trackLogs(query, callback) {
        return NodeAgent.trackLogs(query, callback);
    }

    function refreshLogs(handle, maxResults, callback) {
        return NodeAgent.refreshLogs(handle, maxResults, callback);
    }

    function backtrace(options, callback) {
        return NodeAgent.backtrace(options, callback);
    }

    exports.init = init;
    exports.isReady = isReady;
    exports.possibleRemotePathsForLocalPath = possibleRemotePathsForLocalPath;
    exports.couldBeRemotePath = couldBeRemotePath;

    // satisfied from locally cached data (sync)
    exports.functionWithId = functionWithId;
    exports.functionsInFile = functionsInFile;
    exports.cachedHitCounts = cachedHitCounts;

    // fetch data from the instrumented app (async)
    exports.refreshHitCounts = refreshHitCounts;
    exports.trackLogs = trackLogs;
    exports.refreshLogs = refreshLogs;
    exports.backtrace = backtrace;
});
