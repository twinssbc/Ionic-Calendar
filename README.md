# Ionic-Calendar directive

Ionic calendar directive

# Demo
http://twinssbc.github.io/Ionic-Calendar/demo/

# Usage

Bower Install: `bower install ionic-calendar`

Load the necessary dependent files:

    <link rel="stylesheet" href="http://code.ionicframework.com/1.1.1/css/ionic.min.css"/>
    <link rel="stylesheet" href="<bower lib installation path>/ionic-calendar/dist/css/calendar.min.css"/>
    <script src="http://code.ionicframework.com/1.1.1/js/ionic.bundle.min.js"></script>
    <script src="<bower lib installation path>/ionic-calendar/dist/js/calendar-tpls.min.js"></script>

Add the calendar module as a dependency to your application module:

    var myAppModule = angular.module('MyApp', ['ui.rCalendar'])

Add the directive in the html page

    <calendar calendar-mode="mode" event-source="eventSource">


To change calendar selected date, simply use ng-model

    $scope.selectedDate = new Date();
    <calendar calendar-mode="mode" event-source="eventSource" ng-model="selectedDate"></calendar>

# Options

* formatDay    
The format of the date displayed in the month view.    
Default value: 'dd'
* formatDayHeader    
The format of the header displayed in the month view.    
Default value: 'EEE'
* formatDayTitle    
The format of the title displayed in the day view.    
Default value: 'MMMM dd, yyyy'
* formatWeekTitle    
The format of the title displayed in the week view.    
Default value: 'MMMM yyyy, Week w'
* formatMonthTitle    
The format of the title displayed in the month view.    
Default value: 'MMMM yyyy'
* formatWeekViewHeader    
The format of the header displayed in the week view.    
Default value: 'EEE d'
* formatHourColumn    
The format of the hour column displayed in the week and day view.    
Default value: 'ha'
* calendarMode    
The initial mode of the calendar.    
Default value: 'month'
* showEventDetail    
If set to true, when selecting the date in the month view, the events happened on that day will be shown below.    
Default value: true
* startingDayMonth    
Control month view starting from which day.    
Default value: 0
* startingDayWeek    
Control week view starting from which day.    
Default value: 0
* allDayLabel    
The text displayed in the allDay column header.    
Default value: ‘all day’
* noEventsLabel    
The text displayed when there’s no event on the selected date in month view.    
Default value: ‘No Events’
* eventSource    
The data source of the calendar, when the eventSource is set, the view will be updated accordingly.    
Default value: null    
The format of the eventSource is described in the EventSource section
* queryMode    
If queryMode is set to 'local', when the range or mode is changed, the calendar will use the already bound eventSource to update the view    
If queryMode is set to 'remote', when the range or mode is changed, the calendar will trigger a callback function rangeChanged.    
Users will need to implement their custom loading data logic in this function, and fill it into the eventSource. The eventSource is watched, so the view will be updated once the eventSource is changed.    
Default value: 'local'
* step    
It can be set to 15 or 30, so that the event can be displayed at more accurate position in weekview or dayview.
* autoSelect    
If set to true, the current calendar date will be auto selected when calendar is loaded or swiped in the month view.    
Default value: true

# View Customization Options

* monthviewDisplayEventTemplateUrl    
The template url to provide customized view for event displayed in the monthview    
Default value: 'templates/rcalendar/monthviewDisplayEvent.html'

```
        <calendar ... monthview-display-event-template-url="monthviewDisplayEventTemplateUrl"></calendar>
        
        $scope.monthviewDisplayEventTemplateUrl = 'myTemplate.html';
```
* monthviewEventDetailTemplateUrl    
The template url to provide customized view for event detail section in the monthview    
Default value: 'templates/rcalendar/monthviewEventDetail.html'

```
        <calendar ... monthview-event-detail-template-url="monthviewEventDetailTemplateUrl"></calendar>
        
        $scope.monthviewEventDetailTemplateUrl = 'myTemplate.html';
```
* weekviewAllDayEventTemplateUrl    
The template url to provide customized view for all day event in the weekview   
Default value: 'templates/rcalendar/displayEvent.html'

```
        <calendar ... weekview-all-day-event-template-url="weekviewAllDayEventTemplateUrl"></calendar>
        
        $scope.weekviewAllDayEventTemplateUrl = 'myTemplate.html';
```
* weekviewNormalEventTemplateUrl    
The template url to provide customized view for normal event in the weekview    
Default value: 'templates/rcalendar/displayEvent.html'

```
        <calendar ... weekview-normal-event-template-url="weekviewNormalEventTemplateUrl"></calendar>
        
        $scope.weekviewNormalEventTemplateUrl = 'myTemplate.html';
```
* dayviewAllDayEventTemplateUrl    
The template url to provide customized view for all day event in the dayview    
Default value: 'templates/rcalendar/displayEvent.html'

```
        <calendar ... dayview-all-day-event-template-url="dayviewAllDayEventTemplateUrl"></calendar>
        
        $scope.dayviewAllDayEventTemplateUrl = 'myTemplate.html';
```
* dayviewNormalEventTemplateUrl    
The template url to provide customized view for normal event in the dayview    
Default value: 'templates/rcalendar/displayEvent.html'

```
        <calendar ... dayview-normal-event-template-url="dayviewNormalEventTemplateUrl"></calendar>
        
        $scope.dayviewNormalEventTemplateUrl = 'myTemplate.html';
```

# Callback Options

* rangeChanged    
The callback function triggered when the range or mode is changed if the queryMode is set to 'remote'

        $scope.rangeChanged = function (startTime, endTime) {
            Events.query({startTime: startTime, endTime: endTime}, function(events){
                $scope.eventSource=events;
            });
        };

* eventSelected    
The callback function triggered when an event is clicked

        <calendar ... event-selected="onEventSelected(event)"></calendar>    
    
        $scope.onEventSelected = function (event) {
            console.log(event.title);
        };

* timeSelected    
The callback function triggered when a date is selected in the monthview. If there's no event at the selected time, the events parameter will be either undefined or empty array

        <calendar ... time-selected="onTimeSelected(selectedTime, events, disabled)”></calendar>
        
        $scope.onTimeSelected = function (selectedTime, events, disabled) {
            console.log('Selected time: ' + selectedTime + ', hasEvents: ' + (events !== undefined && events.length !== 0) + ‘, disabled: ’ + disabled);
        };

* titleChanged    
The callback function triggered when the view title is changed

        <calendar ... title-changed="onViewTitleChanged(title)”></calendar>
        
        $scope.onViewTitleChanged = function (title) {
            $scope.viewTitle = title;
        };

* isDateDisabled
The callback function to determine if the date should be disabled

        <calendar ... is-date-disabled="isDateDisabled(date)”></calendar>
        
        $scope.isDateDisabled = function (date) {
            var currentDate = new Date();
            currentDate.setHours(0,0,0);
            return date <= currentDate;
        };

# EventSource

EventSource is an array of event object which contains at least below fields:

* title
* startTime    
If allDay is set to true, the startTime has to be as a UTC date which time is set to 0:00 AM, because in an allDay event, only the date is considered, the exact time or timezone doesn't matter.    
For example, if an allDay event starting from 2014-05-09, then startTime is

        var startTime = new Date(Date.UTC(2014, 4, 8));

* endTime    
If allDay is set to true, the startTime has to be as a UTC date which time is set to 0:00 AM, because in an allDay event, only the date is considered, the exact time or timezone doesn't matter.    
For example, if an allDay event ending to 2014-05-10, then endTime is

        var endTime = new Date(Date.UTC(2014, 4, 9));

* allDay    
Indicates the event is allDay event or regular event

**Note**
In the current version, the calendar controller only watches for the eventSource reference as it's the least expensive.
That means only you manually reassign the eventSource value, the controller get notified, and this is usually fit to the scenario when the range is changed, you load a new data set from the backend.
In case you want to manually insert/remove/update the element in the eventSource array, you can call broadcast the 'eventSourceChanged' event to notify the controller manually.

# Events

* changeDate    
When receiving this event, the calendar will move the current view to previous or next range.  
Parameter: direction  
1 - Forward  
-1 - Backward

        $scope.$broadcast('changeDate', 1);

* eventSourceChanged    
This event is only needed when you manually modify the element in the eventSource array.  
Parameter: value  
The whole event source object

        $scope.$broadcast('eventSourceChanged',$scope.eventSource);

# i18n support
When including the angular locale script, the viewTitle and header of the calendar will be translated to local language automatically.

        <script src="http://code.angularjs.org/1.4.3/i18n/angular-locale_xx.js"></script>
