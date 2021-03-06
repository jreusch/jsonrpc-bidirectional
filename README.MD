# Bidirectional JSON-RPC

[![Version npm](https://img.shields.io/npm/v/jsonrpc-bidirectional.svg)](https://www.npmjs.com/package/jsonrpc-bidirectional)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fbigstepinc%2Fjsonrpc-bidirectional.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fbigstepinc%2Fjsonrpc-bidirectional?ref=badge_shield)

[![Linux build](https://travis-ci.org/bigstepinc/jsonrpc-bidirectional.svg?branch=master)](https://travis-ci.org/bigstepinc/jsonrpc-bidirectional)

A main goal of this project is to have the JSON-RPC server and client support __bidirectional JSON-RPC requests over a single WebSocket connection.__ In short, it makes it possible to have a JSONRPC __Server__ on the client side, or on both sides at once.

This library is tested in __browsers__ (>= IE10) and in __Node.js__ (>=7.8).

Very simple usage allows for very easy application development: 
 * export methods in an endpoint (which extends JSONRPC.EndpointBase), and call those method remotely through a client (which extends JSONRPC.Client);
 * on bidirectional transports, there may be endpoints at both ends of a connection, or reversed roles (TCP client is a JSONRPC server, while TCP server is JSONRPC client).
 * all remote invocations are asynchronous (multiple responses on the same connection are matched to the right waiting promises)

## Transports

These transports are already implemented, and they all offer promise-based asynchronous method invocations:

| Transport | Type | Browser | Node.js | Serialization |
|-----------|----------------------------------|:-----:|:-----:|-------|
| HTTP | one-way, new connection per call | [fetch](https://developer.mozilla.org/en/docs/Web/API/Fetch_API) | [node-fetch](https://github.com/bitinn/node-fetch) | JSON |
| WebSocket | bidirectional over a single connection | [WebSocket](https://developer.mozilla.org/en/docs/Web/API/WebSocket) | [ws](https://github.com/websockets/ws) | JSON |
| Worker | bidirectional over a single connection | [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) | [Worker](https://nodejs.org/api/cluster.html#cluster_class_worker) | [Structured cloning](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) |
| Worker Threads | bidirectional over a single connection |  | [Worker Thread](https://nodejs.org/api/worker_threads.html#worker_threads_class_worker) | [Structured cloning](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) + [SharedArrayBuffer support](https://nodejs.org/api/worker_threads.html#worker_threads_worker_postmessage_value_transferlist) |
| ProcessStdIO | one-way, new child process per call | | [Process](https://nodejs.org/api/process.html#process_process) | JSON |
| WebRTC | bidirectional over a single connection | [RTCDataChannel](https://developer.mozilla.org/en/docs/Web/API/RTCDataChannel) | [wrtc RTCDataChannel](https://www.npmjs.com/package/wrtc) | JSON |
| ElectronIPC | bidirectional over a single connection | [ipcRenderer](https://electronjs.org/docs/api/ipc-renderer) | [ipcMain](https://electronjs.org/docs/api/ipc-main) | JSON (internally in IPC)
 
#### WebSocket

__Any WebSocket implementation may be used__, as handling of the HTTP server and WebSocket is external to these JSONRPC classes.

For WebSocket client support in Node.js and browsers, `JSONRPC.Plugins.Client.WebSocketTransport` accepts connected W3C compatible WebSocket class instances (out of the box browser [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) and Node.js [websockets/ws](https://github.com/websockets/ws) `WebSocket`). 

On the Node.js side, this library is tested to work with [websockets/ws](https://github.com/websockets/ws). Other `WebSocketServer` implementations are supported if API compatible with `websockets/ws` (constructor and events), or made compatible through an adapter.

There is a wrapper for [uWebSockets](https://github.com/uWebSockets/uWebSockets) in `JSONRPC.WebSocketAdapters.uws.WebSocketWrapper`. All obtained `uws.WebSocket` instances (from the `connection` event, or instantiated directly) must be wrapped (and thus replaced) with an instance of this class. According to localhost benchmarks of this library, ws performs better than uws. __Warning:__ uws is buggy when calling .close() on the server (segmentation fault or infinite hang) and it also immediately closes connections with an empty reason string if very large payloads are sent. See `tests/uws_bug*`.

#### HTTP

`JSONRPC.Client` has embeded support for HTTP requests, through [fetch](https://developer.mozilla.org/en/docs/Web/API/Fetch_API) (polyfills for older browsers exist, and work just fine). `JSONRPC.Server` has the `attachToHTTPServer` method.

#### Worker
For Worker client support in Node.js and browsers, `JSONRPC.Plugins.Client.WorkerTransport` and `JSONRPC.BidirectionalWorkerRouter` accept Node.js [cluster.Worker](https://nodejs.org/api/cluster.html#cluster_class_worker) or standard browser [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker) class instances. 

See `tests/Tests/AllTests.runClusterTests()` and `tests/Browser/index.html` for an example of how to setup servers and clients for master-worker asynchronous communication.

Build your application upon `src/NodeClusterBase` to automatically scale to all CPU cores using forked child processed.

#### Worker Threads
For Worker Threads support in Node.js, `JSONRPC.Plugins.Client.WorkerThreadTransport` and `JSONRPC.BidirectionalWorkerThreadRouter` accept Node.js [worker_threads.Worker](https://nodejs.org/api/worker_threads.html#worker_threads_class_worker) class instances. 

See `tests/Tests/AllTests.runThreadsTests()` for an example of how to setup servers and clients for inter-thread asynchronous communication.

Build your application upon `src/NodeWorkerThreadsBase` to automatically scale to all CPU cores using worker threads.

#### WebRTC
Browser to browser asynchronous RPC.

The `JSONRPC.Plugins.Client.WebRTCTransport` and `JSONRPC.BidirectionalWebRTCRouter` classes accept standard browser connected [RTCConnection](https://developer.mozilla.org/en/docs/Web/API/RTCDataChannel) class instances. 

See `tests/Tests/BrowserWebRTC/*` for a browser side example. See `tests/Tests/TestEndpoint` for the server side mediator.

#### Other

It is easy to support other transports, see `JSONRPC.Plugins.Client.WebSocketTransport` for an example.

## Scaling

NodeJS is purpose build to allow scaling to all CPU cores and then on multiple machines (automatic round robin TCP connections to child workers, using automatically shared TCP sockets, see [https://nodejs.org/dist/latest-v12.x/docs/api/cluster.html#cluster_how_it_works](https://nodejs.org/dist/latest-v12.x/docs/api/cluster.html#cluster_how_it_works)). Virtually all programs built in NodeJS for networking purposes are always event based programming which best leverages the CPU time on each CPU core. When considering multiple servers this has a dramatic effect as hundreds of servers serving network requests can sometimes be reduced to tens or just a few servers.

This library can serve as a foundation which automatically scales to all CPU cores using cluster workers or thread workers (interchangeably at any time as they have a common interface) using a single worker process per CPU core, thus satistfying the performance requirement to reduce kernel context (thread) switching overhead with tens of thousands to millions of connections.

All API interface functions exported for RPC are defined using async/await thus allowing automatic error handling (errors are catched and serialized via the RPC protocol to the caller) by this library. All function invocations thorugh a network transport (HTTP, WebSocket, raw sockets, workers IPC, etc.) are of course naturally event based.

Scalability to all CPU cores and multiple servers is enabled automatically and without any effort on the programmer part because the **Actor pattern** is enabled from the get go: all exported functions invocations receive a private context in the `incomingRequest` param under `incomingRequest.session`.

The above is even true in browsers where only a single worker per CPU core (assuming the no of CPU cores can be guessed somehow, as browsers hide that) can be kept alive indefinitely to receive asynchronous (independendly running API calls which basically return promises) invocations. There is no need to start a new worker for each workload, thus keeping the number of busy threads as low as possible.

At server level, memory usage is kept as low as possible and can be constant as the number of busy threads is always equal to the number of cores. The memory usage because of the runtime overhead (nodejs + user code) does not grow with the number of requests.

**It is dead simple to make use of this library to properly scale your application.** Just extend the existing base classes under `src/NodeClusterBase` (cluster workers aka forked child processes) or `src/NodeWorkerThreadsBase` (worker threads).

See the Transports section for additional RPC transports to export APIs for inter-process communication when using cluster workers or worker threads.

See [src/NodeClusterBase/README.MD](https://github.com/bigstepinc/jsonrpc-bidirectional/tree/master/src/NodeClusterBase) for additional comments.

## Events and plugins

Plugins are allowed to replace the JSON-RPC protocol altogether, extend the protocol or wrap it.

__Plugins for the server or the client may also be custom middle layers__, for example: authentication, authorization, validation, routing, backward compatibility translation, advanced error logging, automatic retries, caching, etc.

See `JSONRPC.ClientPluginBase` and `JSONRPC.ServerPluginBase`. Plugins may be added on `JSONRPC.Server` and `JSONRPC.Client` instances using the `.addPlugin()` method.

Events may be used instead of plugins. Method names in `JSONRPC.ClientPluginBase` and `JSONRPC.ServerPluginBase` are also event names (event handlers have the same params) while `JSONRPC.Server` and `JSONRPC.Client` emit these events.

Events may be more efficient than plugins, if very small performance gains matter. Plugins on the other hand help write readable and maintainable code (and are asynchronous).


## Define an endpoint
`JSONRPC.Server` exports methods of registered `JSONRPC.EndpointBase` subclass instances.

The JSONRPC.Server supports multiple endpoints at the same time.

On an incoming request, endpoints are identified by the URL path of the HTTP request, or of the WebSocket connection. 

For example, both these URLs point to the same endpoint: `ws://localhost/api`, `http://localhost/api`, as both have `/api` as path.

:warning: When in bidirectional mode, the endpoints at both ends of a connection must be initialized with the same path value (even if exporting different functions). The reverse calls client will connect to the same endpoint path as the one indicated by the current WebSocket connection URL.

```JavaScript

const JSONRPC = require("jsonrpc-bidirectional");

module.exports =
class TestEndpoint extends JSONRPC.EndpointBase 
{
	constructor()
	{
		super(
			/*strName*/ "Test", 
			/*strPath*/ "/api", 
			/*objReflection*/ {}, // Reserved for future use.
			/*classReverseCallsClient*/ JSONRPC.Client // This may be left undefined
		);

		// The class reference classReverseCallsClient must be specified to enable bidirectional JSON-RPC over a single WebSocket connection.
		// If may be left undefined for one-way interrogation.
		// It must contain a reference to a subclass of JSONRPC.Client or a reference to the JSONRPC.Client class itself.
	}

	async ping(incomingRequest, strReturn, bThrow)
	{
		if(bThrow)
		{
			throw new JSONRPC.Exception("You asked me to throw.");
		}

		// If using bidirectional JSON-RPC over a single WebSocket connection, a JSONRPC.Client subclass instance is available.
		// It is an instance of the class specified in the constructor of this EndpointBase subclass, `classReverseCallsClient`.
		// Also, it is attached to the same WebSocket connection of the current request.
		await incomingRequest.reverseCallsClient.rpc("methodOnTheOtherSide", ["paramValue", true, false]);

		return strReturn;
	}

	async divide(incomingRequest, nLeft, nRight)
	{
		return nLeft / nRight;
	}
};
```


## Extending the client

Extending the `JSONRPC.Client` base class makes the code more readable. 

This client's function names and params correspond to what `TestEndpoint` exports (defined above).

```JavaScript
const JSONRPC = require("jsonrpc-bidirectional");

module.exports =
class TestClient extends JSONRPC.Client
{
	/**
	 * @param {JSONRPC.IncomingRequest} incomingRequest
	 * @param {string} strReturn
	 * @param {boolean} bThrow
	 * 
	 * @returns {string}
	 */
	async ping(strReturn, bThrow)
	{
		return this.rpc("ping", [...arguments]);
	}


	/**
	 * JSONRPC 2.0 notification. 
	 * The server may keep processing "after" this function returns, as the server will never send a response.
	 * 
	 * @param {JSONRPC.IncomingRequest} incomingRequest
	 * 
	 * @returns null
	 */
	async pingFireAndForget()
	{
		return this.rpc("ping", [...arguments], /*bNotification*/ true);
	}


	/**
	 * @param {number} nLeft
	 * @param {number} nRight
	 *
	 * @returns {number}
	 */
	async divide(nLeft, nRight)
	{
		return this.rpc("divide", [...arguments]);
	}
}
```


## Simple JSONRPC.Server over HTTP
```JavaScript
const JSONRPC = require("jsonrpc-bidirectional");

const httpServer = http.createServer();
const jsonrpcServer = new JSONRPC.Server();

jsonrpcServer.registerEndpoint(new TestEndpoint());

jsonrpcServer.attachToHTTPServer(httpServer, "/api/");

// By default, JSONRPC.Server rejects all requests as not authenticated and not authorized.
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthenticationSkip());
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthorizeAll());

httpServer.listen(80);
```


## Simple JSONRPC.Client over HTTP
```JavaScript
const JSONRPC = require("jsonrpc-bidirectional");


const testClient = new TestClient("http://localhost/api");

const fDivisionResult = await testClient.divide(2, 1);
```


## Simple JSONRPC.Client over WebSocket
Non-bidirectional JSONRPC.Client over a WebSocket client connection.

The client automatically reconnects in case of a connection drop.

```JavaScript
const JSONRPC = require("jsonrpc-bidirectional");
const WebSocket = require("ws");


// The WebSocketTransport plugin requires that the WebSocket connection instance supports the `close`, `error` and `message` events of the https://github.com/websockets/ws API.
// If not using `websockets/ws`, the WebSocketTransport plugin may be extended to override WebSocketTransport._setupWebSocket().


const testClient = new TestClient("http://localhost/api");

// Reconnecting websocket transport.
const webSocketTransport = new JSONRPC.Plugins.Client.WebSocketTransport(
	/*ws*/ null, 
	/*bBidirectionalMode*/ false,
	{
		bAutoReconnect: true,
		strWebSocketURL: "ws://localhost/api"", 
		
		// Optional WebSocket extra-initialization after the WebSocket becomes "open" (connected).
		fnWaitReadyOnConnected: async() => {
		        // Optional to authenticate the connection.
			await testClient.rpcX({method: "login", params: ["admin", "password"], skipWaitReadyOnConnect: true});
		}
	}
);
testClient.addPlugin(webSocketTransport);


const fDivisionResult = await testClient.divide(2, 1);
```


## Bidirectional JSON-RPC over WebSocket

This JSONRPC server and client can be bidirectional over __a single WebSocket connection__. 

In other words, there may be a `JSONRPC.Server` instance __and__ a `JSONRPC.Client` instance at one end, and another pair (or more) at the other end.

At the WebSocket or __TCP/HTTP server__ connection end, the `JSONRPC.Server` will automatically instantiate a `JSONRPC.Client` subclass per connection (of the class specified by the serving endpoint).


Common:

```JavaScript
// BidirectionalWebsocketRouter and the WebSocketTransport plugin both require that the WebSocket connection instance supports the `close`, `error` and `message` events of the https://github.com/websockets/ws API.
// If not using `websockets/ws`, a wrapping adapter which emits the above events must be provided (if the WebSocket implementation is not already compatible with `websockets/ws`).

// BidirectionalWebsocketRouter also uses properties on WebSocket instances to get the URL path (needed to determine the endpoint), like this: `webSocket.url ? webSocket.url : webSocket.upgradeReq.url`.

const JSONRPC = require("jsonrpc-bidirectional");
const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;
```


__Site A. WebSocket server (accepts incoming TCP connections), JSONRPC server & client:__

```JavaScript
const jsonrpcServer = new JSONRPC.Server();
jsonrpcServer.registerEndpoint(new TestEndpoint()); // See "Define an endpoint" section above.

// By default, JSONRPC.Server rejects all requests as not authenticated and not authorized.
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthenticationSkip());
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthorizeAll());

const wsJSONRPCRouter = new JSONRPC.BidirectionalWebsocketRouter(jsonrpcServer);

// Optional.
wsJSONRPCRouter.on("madeReverseCallsClient", (clientReverseCalls) => { /*add plugins or just setup the client even further*/ });

// Alternatively reuse existing web server: 
// const webSocketServer = new WebSocketServer({server: httpServerInstance});
const webSocketServer = new WebSocketServer({port: 8080});
webSocketServer.on("error", (error) => {console.error(error); process.exit(1);});

webSocketServer.on(
	"connection", 
	async(webSocket, upgradeRequest) => 
	{
		const nWebSocketConnectionID = wsJSONRPCRouter.addWebSocketSync(webSocket, upgradeRequest);
		// Do something with nWebSocketConnectionID and webSocket here, like register them as a pair with an authorization plugin.

		// const clientForThisConnection = wsJSONRPCRouter.connectionIDToSingletonClient(nWebSocketConnectionID, JSONRPC.Client);
	}
);
```


__Site B. WebSocket client (connects to the above WebSocket TCP server), JSONRPC server & client:__

```JavaScript
const jsonrpcServer = new JSONRPC.Server();
jsonrpcServer.registerEndpoint(new TestEndpoint()); // See "Define an endpoint" section above.

// By default, JSONRPC.Server rejects all requests as not authenticated and not authorized.
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthenticationSkip());
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthorizeAll());


const webSocket = new WebSocket("ws://localhost:8080/api");
await new Promise((fnResolve, fnReject) => {
	webSocket.addEventListener("open", fnResolve);
	webSocket.addEventListener("error", fnReject);
});


const wsJSONRPCRouter = new JSONRPC.BidirectionalWebsocketRouter(jsonrpcServer);


const nWebSocketConnectionID = wsJSONRPCRouter.addWebSocketSync(webSocket);


// Obtain single client. See above section "Extending the client" for the TestClient class (subclass of JSONRPC.Client).
const theOnlyClient = wsJSONRPCRouter.connectionIDToSingletonClient(nWebSocketConnectionID, TestClient);

await theOnlyClient.divide(3, 2);
```


__Site B (ES5 browser). WebSocket client (connects to the above WebSocket TCP server), JSONRPC server & client:__
```html
<!doctype html>
<html>
	<head>
		<title>Tests</title>

		<!-- These are external to jsonrpc.min.js intentionally, to reduce file size and reuse them for other libraries. -->
		<script type="text/javascript" src="/node_modules/babel-polyfill/dist/polyfill.min.js"></script>
		<script type="text/javascript" src="/node_modules/whatwg-fetch/fetch.js"></script>
		<script type="text/javascript" src="/node_modules/es6-promise/dist/es6-promise.auto.min.js"></script>

		<!-- Already covered by babel-polyfill: script type="text/javascript" src="/node_modules/regenerator-runtime/runtime.js"></script-->
		<script type="text/javascript" src="/builds/browser/es5/jsonrpc.min.js"></script>

		<script>
			function TestEndpoint()
			{
				JSONRPC.EndpointBase.prototype.constructor.apply(
					this,
					[
						/*strName*/ "Test", 
						/*strPath*/ location.protocol + "//" + location.host + "/api", 
						/*objReflection*/ {},
						/*classReverseCallsClient*/ JSONRPC.Client
					]
				);
			}

			TestEndpoint.prototype = new JSONRPC.EndpointBase("TestEndpoint", "/api", {});
			TestEndpoint.prototype.constructor = JSONRPC.EndpointBase;

			TestEndpoint.prototype.ping = function(incomingRequest, strReturn){
				return new Promise(function(fnResolve, fnReject){
					fnResolve(strReturn);
				});
			};


			var client;
			var clientWS;
			var clientOfBidirectionalWS;


			function testSimpleClient()
			{
				client = new JSONRPC.Client("http://" + location.host + "/api");
				client.rpc("ping", ["Calling from html es5 client, http transport."]).then(genericTestsPromiseCatch).catch(genericTestsPromiseCatch);
				
				

				clientWS = new JSONRPC.Client("http://" + location.host + "/api");

				var ws = new WebSocket("ws://" + location.host +  "/api"); 
				clientWS.addPlugin(new JSONRPC.Plugins.Client.WebSocketTransport(ws, /*bBidirectionalWebSocketMode*/ false));
				
				ws.addEventListener("open", function(event){
					client.rpc("ping", ["Calling from html es5 client, websocket transport."])
						.then(console.log)
						.catch(console.log)
					;
				});
			}


			function testBidirectionalRPC()
			{
				var jsonrpcServer = new JSONRPC.Server();
				jsonrpcServer.registerEndpoint(new TestEndpoint());

				// By default, JSONRPC.Server rejects all requests as not authenticated and not authorized.
				jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthenticationSkip());
				jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthorizeAll());

				var ws = new WebSocket("ws://" + location.host +  "/api"); 

				ws.addEventListener("open", function(event){
					var wsJSONRPCRouter = new JSONRPC.BidirectionalWebsocketRouter(jsonrpcServer);

					var nWebSocketConnectionID = wsJSONRPCRouter.addWebSocketSync(ws);

					clientOfBidirectionalWS = wsJSONRPCRouter.connectionIDToSingletonClient(nWebSocketConnectionID, JSONRPC.Client);

					clientOfBidirectionalWS.rpc("ping", ["Calling from html es5 client, websocket transport with bidirectional JSONRPC."])
						.then(console.log)
						.catch(console.log)
					;
				});
			}
		

			window.addEventListener(
				"load",
				function(event){
					testSimpleClient();
					testBidirectionalRPC();
				}
			);
		</script>
	</head>
	<body>
		Open the developer tools console (F12 for most browsers, CTRL+SHIFT+I in Electron) to see errors or manually make calls.
	</body>
</html>
```

## MIT license
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fbigstepinc%2Fjsonrpc-bidirectional.svg?type=large)]
