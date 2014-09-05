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
  var startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  var endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  var i = startOfMonth;
  while(i < endOfMonth){
    dateKey = i.toISOString().substr(0, 10);
    result[dateKey] = [];
    endOfWork = new Date(i.getTime()).setHours(config.workStopHour)
    
    i.setHours(config.workStartHour);
    while((endOfWork - i) >= (60 * 60 * 1000 * booking_duration)){
      result[dateKey].push(new Date(i.getTime()));
      i.setMinutes(i.getMinutes() + 30);
    }
    
    i.setDate(i.getDate() + 1);
  }

  return result;
}

function filterBookingConflicts(availableTimings, bookings){
  var currentDate = new Date();
  var startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  var endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  for(var i=0; i < bookings.length; i++){
    var b = bookings[i];
    // We're going to make sure any dates in our timing list
    // that conflict with this booking are removed
    var d = new Date(b.start.getTime());

    // Make sure we're operating within our month
    // and increase the date if we're dealing with
    // a recurring booking from earlier
    if(b.recurring_days > 0){
      while(d < startOfMonth){
        d.setDate(d.getDate() + b.recurring_days);
      }
    }

    // Start the check!
    while(d < endOfMonth){

      dateKey = d.toISOString().substr(0, 10);
      timings = availableTimings[dateKey]

      if( timings ){
        // Looks like we have potential bookings
        // on this day. Better filter them!
        bookingStart = d;
        bookingEnd = new Date(d.getTime());
        bookingEnd.setHours(bookingEnd.getHours() + b.duration);
        for(var j=0; j < timings.length; j++){
          if(timings[j] >= bookingStart && timings[j] <= bookingEnd){
            // Booking conflict. Remove the item from the list
            // of available timings
            timings.splice(j, 1);
          }
        }
      }

      if(b.recurring_days > 0){
        d.setDate(d.getDate() + b.recurring_days);
      }else{
        // This booking does not recur. Exit the loop
        break;
      }
    }

  }

  return availableTimings;
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
  duration TINYINT NOT NULL, \
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
      var availableTimings = filterBookingConflicts(createFullAvailabilityObject(booking_duration), rows);
            
      res.json({'availableTimings': availableTimings});
    }
  });
});

app.use('/api', router);

// Start listening for requests
var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Listening on port %d', server.address().port);
});