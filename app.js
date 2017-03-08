/*
 Copyright IBM Corp 2016 All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

/*
 * A simple application utilizing the Node.js Client SDK to:
 * 1) Enroll a user
 * 2) User deploys chaincode
 * 3) User queries chaincode
 */
// "HFC" stands for "Hyperledger Fabric Client"
var hfc = require("hfc");

console.log(" **** starting HFC sample ****");


// get the addresses from the docker-compose environment
var PEER_ADDRESS         = '148.100.5.138:7051';
var MEMBERSRVC_ADDRESS   = '148.100.5.138:7054';

var chain, chaincodeID='ee5b24a1f17c356dd5f6e37307922e39ddba12e5d2e203ed93401d7d05eb0dd194fb9070549c5dc31eb63f4e654dbd5a1d86cbb30c48e3ab1812590cd0f78539';

// Create a chain object used to interact with the chain.
// You can name it anything you want as it is only used by client.
chain = hfc.newChain("mychain");
// Initialize the place to store sensitive private key information
chain.setKeyValStore( hfc.newFileKeyValStore('/tmp/keyValStore') );
// Set the URL to membership services and to the peer
console.log("member services address ="+MEMBERSRVC_ADDRESS);
console.log("peer address ="+PEER_ADDRESS);
chain.setMemberServicesUrl("grpc://"+MEMBERSRVC_ADDRESS);
chain.addPeer("grpc://"+PEER_ADDRESS);

// The following is required when the peer is started in dev mode
// (i.e. with the '--peer-chaincodedev' option)
var mode =  'dev';
console.log("DEPLOY_MODE=" + mode);
if (mode === 'dev') {
    chain.setDevMode(true);
    //Deploy will not take long as the chain should already be running
    chain.setDeployWaitTime(10);
} else {
    chain.setDevMode(false);
    //Deploy will take much longer in network mode
    chain.setDeployWaitTime(120);
}


chain.setInvokeWaitTime(10);

// Begin by enrolling the user
enroll();

// Enroll a user.
function enroll() {
   console.log("enrolling user admin ...");
   // Enroll "admin" which is preregistered in the membersrvc.yaml
   // chain.enroll("WebAppAdmin", "DJY27pEnl16d", function(err, admin) {
    chain.enroll("test_user0", "MS9qrN8hFjlE", function(err, admin) {
      if (err) {
         console.log("ERROR: failed to register admin: %s",err);
         process.exit(1);
      }

      // Set this user as the chain's registrar which is authorized to register other users.
      chain.setRegistrar(admin);
      
      var userName = "JohnDoe";
      // registrationRequest
      var registrationRequest = {
          enrollmentID: userName,
          affiliation: "bank_a"
      };
      chain.registerAndEnroll(registrationRequest, function(error, user) {
          if (error) throw Error(" Failed to register and enroll " + userName + ": " + error);
          console.log("Enrolled %s successfully\n", userName);
          //deploy(user);
          query(user)
      });
   });
}

// Deploy chaincode
function deploy(user) {
   console.log("deploying chaincode; please wait ...");
   // Construct the deploy request
   var deployRequest = {
       chaincodeName: 'cc_02',
       fcn: "init",
       args: ["a", "100", "b", "200"]
   };
   // where is the chain code, ignored in dev mode
   deployRequest.chaincodePath = "github.com/hyperledger/fabric/blob/master/examples/chaincode/go/chaincode_example02/chaincode_example02.go";

   // Issue the deploy request and listen for events
   var tx = user.deploy(deployRequest);
   tx.on('complete', function(results) {
       // Deploy request completed successfully
       console.log("deploy complete; results: %j",results);
       // Set the testChaincodeID for subsequent tests
       chaincodeID = results.chaincodeID;
       query(user);
       invoke(user);
   });
   tx.on('error', function(error) {
       console.log("Failed to deploy chaincode: request=%j, error=%k",deployRequest,error);
       process.exit(1);
   });

}

// Query chaincode
function query(user) {
   console.log("querying chaincode ... id:"+chaincodeID);
   // Construct a query request
   var queryRequest = {
      chaincodeID: chaincodeID,
      //fcn: "read",
      args: ["query","a"]
   };
   // Issue the query request and listen for events
   var tx = user.query(queryRequest);
   tx.on('complete', function (results) {
      console.log("query completed successfully; results=%j",results);
      process.exit(0);
   });
   tx.on('error', function (error) {
      console.log("Failed to query chaincode: request=%j, error=%k",queryRequest,error);
      process.exit(1);
   });
}

//Invoke chaincode
function invoke(user) {
   console.log("invoke chaincode ...");
   // Construct a query request
   var invokeRequest = {
      chaincodeID: chaincodeID,
      fcn: "init",
      args: ["a", "b", "10"]
   };
   // Issue the invoke request and listen for events
   var tx = user.invoke(invokeRequest);
   tx.on('submitted', function (results) {
	      console.log("invoke submitted successfully; results=%j",results);	      
	   });   
   tx.on('complete', function (results) {
      console.log("invoke completed successfully; results=%j",results);
      query(user);      
   });
   tx.on('error', function (error) {
      console.log("Failed to invoke chaincode: request=%j, error=%k",invokeRequest,error);
      process.exit(1);
   });
}