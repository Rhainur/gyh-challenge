Booking Mini App
================

This document will serve as a guide to my thoughts while working on this challenge.

Since the challenge required the code to be in a single Node module, I've decided 
to include the table setup code as a simple query right at the top. Ordinarily, this
would be better handled via some sort of migration system, but for this app I'll be
focusing on the basic functionality rather than working on enterprise-grade
production readiness :)

The base HTML file is served up via Express's built in static content capabilities.

As for the app itself, the model is quite simple. Data is stored in the form of Bookings,
which contain the start and end time for a cleaning session along with an unsigned tinyint
to indicate whether this booking is recurring (0 = non recurring) and a flag indicating
whether the recurrence is still active. In a real world app, the model would be much more 
complicated with information pertaining to location and possibly more complicated recurrence 
systems (i.e "last Sunday of each month"). Hopefully this simple model should cover the
requirements of the challenge.

Availability checking works by first generating a list of all possible start times for the
session while ignoring conflicts i.e merely looking at working hours and session duration,
and then pulling booking information from the database and using it to eliminate times, and
finally returning the filtered timings. Currently, the system checks availability up to 90
days into the future, but this could easily be tweaked via the config, and an inspection of
the code will show that we can just as easily accept an end date via the API parameters and
use that as our upper limit.

