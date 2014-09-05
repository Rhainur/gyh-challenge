Booking Mini App
================

This document will serve as a guide to my thoughts while working on this challenge.

Since the challenge required the code to be in a single Node module, I've decided 
to include the table setup code as a simple query right at the top. Ordinarily, this
would be better handled via some sort of migration system, but for this app I'll be
focusing on the basic functionality rather than working on enterprise-grade
production readiness :)

Setup
------

Just create a MySQL database 'gyhtest' with user 'gyhtest' and password 'gyhtest', or edit app.js to use whatever credentials you want. The app will handle the rest.

Explanation
------------

The base HTML file is served up via Express's built in static content capabilities.

As for the app itself, the model is quite simple. Data is stored in the form of Bookings,
which contain the start time and duration for a cleaning session along with an unsigned tinyint
to indicate whether this booking is recurring (0 = non recurring) and a flag indicating
whether the recurrence is still active. In a real world app, the model would be much more 
complicated with information pertaining to location and possibly more complicated recurrence 
systems (i.e "last Sunday of each month"). Hopefully this simple model should cover the
requirements of the challenge.

The model assumes that if a recurring session is cancelled the "active" field will be set to false.

Availability checking works by 

1. Generating a list of all possible start times for the session while ignoring conflicts with other bookings i.e merely looking at working hours and session duration.
2. Pulling booking information from the database and using it to scan for conflicts
3. If a conflict is found, check if the user wants a recurring booking, and eliminate the original conflict + the other time slots that would prevent a recurring booking.
4. Return all timings that do not conflict with the user's required booking parameters.

Currently, the system checks availability up to 90 days into the future, but this could easily be tweaked via the config, and an inspection of the code will show that we can just as easily accept an end date via the API parameters and use that as our upper limit. getDurationStart() and getDuration() end define the limits of our scanning.

Q&A
---

**Identify all necessary parameter that are transmitted to the backend end-point, in order to receive all available time slots**

To check availability, I take the duration of the booking in hours, and how often it repeats in days (0 = never repeats). In a more full featured application, I would need location, and in an application under heavy load, I would probably restrict the availability checking to a smaller window of time, so I would accept start and end date as parameters to allow "paging" of results.

**Clarify in which step the backend function should be called**

The backend function is called when the user has selected a duration and recurrence and clicks a button to check availability.

**Under which circumstances is it necessary to recall the function?**

If the user changes his input, or if a certain amount of time elapses (say 5 minutes) because the availability may have changed. Regardless, it will be necessary to recheck availability before saving the booking, to avoid a scenario where a conflict is caused by someone else booking the same slot seconds earlier.

**Roughly sketch out the data model (table structure) of this particular part of the application**

	CREATE TABLE IF NOT EXISTS `bookings` (
	  id INT NOT NULL AUTO_INCREMENT,
	  start DATETIME NOT NULL,
	  duration TINYINT NOT NULL,
	  recurring_days TINYINT UNSIGNED DEFAULT 0,
	  active BOOLEAN DEFAULT true,
	  PRIMARY KEY ( id )
	);

Implementation
--------------

The availability checking can be accessed via `GET /api/availability/:duration/:recurrence`. I have also included a small angularJS app to allow testing of the API in a convenient manner. `GET /` should display the web interface. Clicking "Get Availability" will load the available booking times, and clicking on an individual time will create a booking with the predefined input parameters. Please note that I have only performed basic input sanitising on the backend for creating a booking, whereas in production ready code there would be much stronger checks on whether the booking time was valid and available.