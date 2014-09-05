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
  PRIMARY KEY ( id ) \
  );";

connection.query(tableSetupQuery, function(err){
  if(err){
    console.error('Table setup failed: ' + err.stack);
    return;
  }
});

var app = express();