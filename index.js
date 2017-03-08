var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

var hfc = require('hfc');
console.log('init hfc');
var PEER_ADDRESS         = '148.100.5.138:7053';
console.log('PEER_ADDRESS: '+PEER_ADDRESS);
var MEMBERSRVC_ADDRESS   = '148.100.5.138:7054';
console.log('MEMBERSRVC_ADDRESS: '+MEMBERSRVC_ADDRESS);

var chain = hfc.newChain("targetChain");
console.log('generated new chain');


chain.setKeyValStore( hfc.newFileKeyValStore('/tmp/keyValStore') );
chain.setMemberServicesUrl("grpc://MEMBERSRVC_ADDRESS");
chain.addPeer("grpc://PEER_ADDRESS");

chain.enroll("WebAppAdmin", "DJY27pEnl16d", function(err, webAppAdmin) {
   if (err) return console.log("ERROR: failed to register %s: %s",err);
   // Successfully enrolled WebAppAdmin during initialization.
   // Set this user as the chain's registrar which is authorized to register other users.
   console.log('registered webAppAdmin');
   chain.setRegistrar(webAppAdmin);
   // Now begin listening for web app requests
   //listenForUserRequests();
});
/*function listenForUserRequests() {
   for (;;) {
      // WebApp-specific logic goes here to await the next request.
      // ...
      // Assume that we received a request from an authenticated user 
    // and have 'userName' and 'userAccount'.
    // Then determined that we need to invoke the chaincode
      // with 'chaincodeID' and function named 'fcn' with arguments 'args'.
      handleUserRequest(userName,userAccount,chaincodeID,fcn,args);
   }
}
// Handle a user request
function handleUserRequest(userName, userAccount, chaincodeID, fcn, args) {
   // Register and enroll this user.
   // If this user has already been registered and/or enrolled, this will
   // still succeed because the state is kept in the KeyValStore
   // (i.e. in '/tmp/keyValStore' in this sample).
   var registrationRequest = {
           roles: [ 'client' ],
           enrollmentID: userName,
           affiliation: "bank_a",
           attributes: [{name:'role',value:'client'},{name:'account',value:userAccount}]
      };
   chain.registerAndEnroll( registrationRequest, function(err, user) {
      if (err) return console.log("ERROR: %s",err);
      // Issue an invoke request
      var invokeRequest = {
        // Name (hash) required for invoke
        chaincodeID: chaincodeID,
        // Function to trigger
        fcn: fcn,
        // Parameters for the invoke function
        args: args
     };
     // Invoke the request from the user object and wait for events to occur.
     var tx = user.invoke(invokeRequest);
     // Listen for the 'submitted' event
     tx.on('submitted', function(results) {
        console.log("submitted invoke: %j",results);
     });
     // Listen for the 'complete' event.
     tx.on('complete', function(results) {
        console.log("completed invoke: %j",results);
     });
     // Listen for the 'error' event.
     tx.on('error', function(err) {
        console.log("error on invoke: %j",err);
     });
   });
}
*/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded()); 

app.get('/', function(req, res){
  res.sendFile(__dirname +'/index.html');
});
app.get('/testGet', function(req, res){
  res.json({"msg":"test"});
});
app.get('/testGetWithParam', function(req, res){
  var p1 = req.param('p1');
  var p2 = req.param('p2');
  res.json({"concat_param":p1+"+"+p2});
});
app.post('/testPost',function(req, res){
  res.json({"msg":"Posted requested"});
});
app.post('/testPostWithParam',function(req, res){
  var p1 = req.body.p1;
  var p2 = req.body.p2;

  res.json({
    "respond_code":100,
    "object":[
    {"p1":p1},
    {"p2":p2}
    ]
  });
});
io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    var d = new Date();
    console.log(d.getDate()+"/"+d.getMonth()+"/"+d.getYear()+' _'+d.getHours()+"."+d.getMinutes()+"."+d.getSeconds()+'::'+msg);
  });
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});
http.listen(3000, function(){
  console.log('listening on *:3000');
  console.log('avaliable services: testGet,testGetWithParam,testPost,testPostWithParam');
});