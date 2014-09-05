var express = require('express');

var mysql = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'gyhtest',
  password : 'gyhtest',
  database : 'gyhtest'
});

var config = {
  durationLength: 90, // How many days into the future to check booking availability
  /*
  Store the working hours for the cleaning sessions. 
  */
  workStartHour: 9,
  workStopHour: 17 // Any booking must end by this hour
};

// Returns the start of the availability search range
// By default the start of the current day

function getDurationStart(){
  var d = new Date(); 
  d.setHours(0,0,0,0);
  console.log(d);
  return d;
}

// Returns the start of the availability search range
// By default it returns today + config.durationLength days

function getDurationEnd(){
  s = new Date();
  d = new Date(s.getFullYear(), s.getMonth(), config.durationLength, 23, 59, 59);
  console.log(d);
  return d;
}

/*  
    function createFullAvailabilityObject
    Takes the duration of the requested booking

    Returns an object representing all possible timings 
    for the current month where a booking could potentially
    start. Booking length is stored in session_duration
    Output is an object with the keys being
    date strings of the form YYYY-MM-DD and the values
    being an object with a human readable date string
    and an array of available timings.

    These timings will be filtered for conflicts later
*/
function createFullAvailabilityObject(booking_duration){
  var result = {};

  var durationStart = getDurationStart();
  var durationEnd = getDurationEnd();

  var i = durationStart;
  while(i < durationEnd){
    i.setHours(config.workStartHour,0,0,0);
    
    dateKey = i.toISOString().substr(0, 10);
    result[dateKey] = { date: i.toDateString(), timings: [] };
    endOfWork = new Date(i.getTime()).setHours(config.workStopHour)
    

    // If the session can be finished before the end of the work
    // day, add the timing on to our array of available timings
    while((endOfWork - i) >= (60 * 60 * 1000 * booking_duration)){
      result[dateKey].timings.push(new Date(i.getTime()));
      i.setMinutes(i.getMinutes() + 30);
    }
    
    i.setDate(i.getDate() + 1);
  }

  return result;
}


/*
  function filterBookingConflicts
  Takes a list of available timings, and a list of bookings
  and removes all timings that conflict with the list of bookings.
  The requested_booking_recurrence is used in case the user wants
  to book repeated sessions, where we will need to remove all
  timings that can't be repeated every X days.

  Returns a list of available timings with the conflicting timings removed.
*/

function filterBookingConflicts(availableTimings, bookings, requested_booking_recurrence){
  var durationStart = getDurationStart();
  var durationEnd = getDurationEnd();

  for(var i=0; i < bookings.length; i++){
    var b = bookings[i];
    // We're going to make sure any dates in our timing list
    // that conflict with this booking are removed
    var d = new Date(b.start.getTime());

    // Make sure we're operating within our month
    // and increase the date if we're dealing with
    // a recurring booking from earlier
    if(b.recurring_days > 0){
      while(d < durationStart){
        d.setDate(d.getDate() + b.recurring_days);
      }
    }

    // Start the loop!
    while(d < durationEnd){

      dateKey = d.toISOString().substr(0, 10);
      timings = null;
      if(availableTimings[dateKey]){
        timings = availableTimings[dateKey].timings;
      }

      if( timings ){
        // Check all the available timings to see
        // if any of them conflict with this booking
        bookingStart = d;
        bookingEnd = new Date(d.getTime());
        bookingEnd.setHours(bookingEnd.getHours() + b.duration);
        for(var j=0; j < timings.length; j++){
          if(timings[j] >= bookingStart && timings[j] <= bookingEnd){
            // Booking conflict. 
            availableTimings = removeAvailableTimeWithRecurrence(availableTimings, timings[j], requested_booking_recurrence);
          }
        }
      }

      if(b.recurring_days > 0){
        // This booking that we pulled from the database
        // has been set to repeat. We have to check
        // all the repeating days and remove conflicts
        // from there as well
        d.setDate(d.getDate() + b.recurring_days);
      }else{
        // This booking does not recur. Exit the loop
        break;
      }
    }
  }
  return availableTimings;
}

/*
  function removeAvailableTimeWithRecurrence
  Takes a list of available timings, a timing to remove, and whether
  the requested booking will recur. If a time is not available on day X
  and the user has requested a session every 3 days, we will need to
  remove the same time on day X - 3, X - 6, X - 9, etc
*/

function removeAvailableTimeWithRecurrence(availableTimings, timingToRemove, booking_recurrence){
  var durationStart = getDurationStart();

  var d = new Date(timingToRemove.getTime());
  // If the requested booking is going to recur, we
  // have to remove this time slot from earlier days
  // on which the booking might occur.
  if(booking_recurrence > 0){
    // Step backwards as close to the duration start as possible
    while(d >= durationStart){
      d.setDate(d.getDate() - booking_recurrence);
    }

    if(d < durationStart){
      d.setDate(d.getDate() + booking_recurrence);
    }
  }


  // If the booking does not recur, then d = timingToRemove
  // and the loop will only execute once
  while(d <= timingToRemove){
    console.log("test");
    dateKey = d.toISOString().substr(0, 10);
    timings = null;
    if(availableTimings[dateKey]){
      timings = availableTimings[dateKey].timings;
    }

    if( timings ){
      for(var j=0; j < timings.length; j++){
        if((timings[j].getHours() === timingToRemove.getHours()) && (timings[j].getMinutes() === timingToRemove.getMinutes())){
          // Remove the item from the list of available timings
          timings.splice(j, 1);
        }
      }
    }

    if(booking_recurrence === 0){
      break;
    }else{
      d.setDate(d.getDate() + booking_recurrence);
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
router.get('/availability/:duration/:recurrence', function(req, res){
  var booking_duration = parseInt(req.params.duration);
  // Enforce minimum duration of 1 hour
  if(booking_duration === NaN || booking_duration < 1){
    booking_duration = 1;
  }

  var booking_recurrence = parseInt(req.params.recurrence);
  // Enforce default recurrence of never
  if(booking_recurrence === NaN || booking_recurrence < 0){
    booking_recurrence = 0;
  }

  connection.query("SELECT * FROM bookings WHERE active = true;", function(err, rows, fields){
    if(err){
      res.json(null);
    }else{
      var availableTimings = filterBookingConflicts(createFullAvailabilityObject(booking_duration), rows, booking_recurrence);

      res.json({'availableTimings': availableTimings});
    }
  });
});

app.use('/api', router);

// Start listening for requests
var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Listening on port %d', server.address().port);
});