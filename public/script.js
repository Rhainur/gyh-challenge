var app = angular.module('gyhApp', []);
app.controller('BookingController', function($scope, $http){
  $scope.bookingDuration = 1;
  $scope.bookingRecurrence = 0;
  $scope.checkAvailability = function(){
    $http.get('/api/availability/' + parseInt($scope.bookingDuration) + '/' + parseInt($scope.bookingRecurrence)).success(function(data){
      $scope.availableTimings = data.availableTimings;
    });
  }

  $scope.displayFriendlyTime = function(time){
    d = new Date(time);
    return d.toTimeString().substr(0, 5);
  }
});