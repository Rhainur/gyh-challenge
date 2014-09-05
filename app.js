var express = require('express');

var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'gyhtest',
  password : 'gyhtest',
  database : 'gyhtest'
});

var config = {
  /*
  Store the working hours for the cleaning sessions. 
  */
  workStartHour: 9,
  workStopHour: 17 // Any booking must end by this hour
};

// Returns an object representing all possible timings 
// for the current month where a booking could potentially
// start. Booking length is stored in session_duration
function createFullAvailabilityObject(booking_duration){
  var result = {};

  var currentDate = new Date();
  var startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
  var endOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59));

  var i = startOfMonth;
  while(i < endOfMonth){
    dateKey = i.toISOString().substr(0, 10);
    result[dateKey] = [];
    
    i.setHours(config.workStartHour);
    while((i.getHours() + booking_duration) <= config.workStopHour){
      result[dateKey].push(new Date(i.getTime()));
      i.setMinutes(i.getMinutes() + 30);
    }
    
    i.setDate(i.getDate() + 1);
  }

  return result;
}

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
router.get('/availability/:duration', function(req, res){
  var booking_duration = parseInt(req.params.duration) || 1;
  connection.query("SELECT * FROM bookings WHERE active = true;", function(err, rows, fields){
    if(err){
      res.json(null);
    }else{

      var availableTimings = createFullAvailabilityObject(booking_duration);
            
      res.json({'availableTimings': availableTimings});
    }
  });
});

app.use('/api', router);

// Start listening for requests
var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Listening on port %d', server.address().port);
});