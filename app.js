var express = require('express');

var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'gyhtest',
  password : 'gyhtest',
  database : 'gyhtest'
});

connection.connect(function(err){
  if(err){
    console.error('Error while attempting to connect: ' + err.stack);
    return;
  }
  console.log('Successfully connected' + connection.threadId);
});

// Set up the table if needed
var tableSetupQuery = "CREATE TABLE IF NOT EXISTS `bookings` ( \
  id INT NOT NULL AUTO_INCREMENT, \
  start DATETIME NOT NULL, \
  end DATETIME NOT NULL, \
  recurring_days TINYINT UNSIGNED DEFAULT 0, \
  active BOOLEAN DEFAULT true, \
  PRIMARY KEY ( id ) \
  );";

connection.query(tableSetupQuery, function(err){
  if(err){
    console.error('Table setup failed: ' + err.stack);
    return;
  }
});

var app = express();
var router = express.Router();

// Static files
app.use(express.static(__dirname + '/public'));

// Routes
router.post('/availability', function(req, res){
  connection.query("SELECT * FROM bookings WHERE active = true;", function(err, rows, fields){
    if(err){
      res.json(null);
    }else{
      var currentDate = new Date();
      var firstDayOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
      var lastDayOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      
      availableTimings = [];
      res.json({'availableTimings': availableTimings});
    }
  });
});

app.use('/api', router);

// Start listening for requests
var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Listening on port %d', server.address().port);
});