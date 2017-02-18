angular.module('ui.rCalendar', [])
    .constant('calendarConfig', {
        formatDay: 'dd',
        formatDayHeader: 'EEE',
        formatDayTitle: 'MMMM dd, yyyy',
        formatWeekTitle: 'MMMM yyyy, Week w',
        formatMonthTitle: 'MMMM yyyy',
        formatWeekViewDayHeader: 'EEE d',
        formatHourColumn: 'ha',
        calendarMode: 'month',
        showEventDetail: true,
        startingDayMonth: 0,
        startingDayWeek: 0,
        allDayLabel: 'all day',
        noEventsLabel: 'No Events',
        eventSource: null,
        queryMode: 'local',
        step: 60,
        autoSelect: true,
        monthviewDisplayEventTemplateUrl: 'templates/rcalendar/monthviewDisplayEvent.html',
        monthviewEventDetailTemplateUrl: 'templates/rcalendar/monthviewEventDetail.html',
        weekviewAllDayEventTemplateUrl: 'templates/rcalendar/displayEvent.html',
        weekviewNormalEventTemplateUrl: 'templates/rcalendar/displayEvent.html',
        dayviewAllDayEventTemplateUrl: 'templates/rcalendar/displayEvent.html',
        dayviewNormalEventTemplateUrl: 'templates/rcalendar/displayEvent.html'
    })
    .controller('ui.rCalendar.CalendarController', ['$scope', '$attrs', '$parse', '$interpolate', '$log', 'dateFilter', 'calendarConfig', '$timeout', '$ionicSlideBoxDelegate', function ($scope, $attrs, $parse, $interpolate, $log, dateFilter, calendarConfig, $timeout, $ionicSlideBoxDelegate) {
        'use strict';
        var self = this,
            ngModelCtrl = {$setViewValue: angular.noop}; // nullModelCtrl;

        // Configuration attributes
        angular.forEach(['formatDay', 'formatDayHeader', 'formatDayTitle', 'formatWeekTitle', 'formatMonthTitle', 'formatWeekViewDayHeader', 'formatHourColumn',
            'allDayLabel', 'noEventsLabel'], function (key, index) {
            self[key] = angular.isDefined($attrs[key]) ? $interpolate($attrs[key])($scope.$parent) : calendarConfig[key];
        });

        angular.forEach(['showEventDetail', 'monthviewDisplayEventTemplateUrl', 'monthviewEventDetailTemplateUrl', 'weekviewAllDayEventTemplateUrl', 'weekviewNormalEventTemplateUrl', 'dayviewAllDayEventTemplateUrl', 'dayviewNormalEventTemplateUrl', 'eventSource', 'queryMode', 'step', 'startingDayMonth', 'startingDayWeek', 'autoSelect'], function (key, index) {
            self[key] = angular.isDefined($attrs[key]) ? ($scope.$parent.$eval($attrs[key])) : calendarConfig[key];
        });

        self.hourParts = 1;
        if (self.step === 60 || self.step === 30 || self.step === 15) {
            self.hourParts = Math.floor(60 / self.step);
        } else {
            throw new Error('Invalid step parameter: ' + self.step);
        }

        var unregisterFn = $scope.$parent.$watch($attrs.eventSource, function (value) {
            self.onEventSourceChanged(value);
        });

        $scope.$on('$destroy', unregisterFn);

        $scope.calendarMode = $scope.calendarMode || calendarConfig.calendarMode;
        if (angular.isDefined($attrs.initDate)) {
            self.currentCalendarDate = $scope.$parent.$eval($attrs.initDate);
        }
        if (!self.currentCalendarDate) {
            self.currentCalendarDate = new Date();
            if ($attrs.ngModel && !$scope.$parent.$eval($attrs.ngModel)) {
                $parse($attrs.ngModel).assign($scope.$parent, self.currentCalendarDate);
            }
        }

        function overlap(event1, event2) {
            var earlyEvent = event1,
                lateEvent = event2;
            if (event1.startIndex > event2.startIndex || (event1.startIndex === event2.startIndex && event1.startOffset > event2.startOffset)) {
                earlyEvent = event2;
                lateEvent = event1;
            }

            if (earlyEvent.endIndex <= lateEvent.startIndex) {
                return false;
            } else {
                return !(earlyEvent.endIndex - lateEvent.startIndex === 1 && earlyEvent.endOffset + lateEvent.startOffset > self.hourParts);
            }
        }

        function calculatePosition(events) {
            var i,
                j,
                len = events.length,
                maxColumn = 0,
                col,
                isForbidden = new Array(len);

            for (i = 0; i < len; i += 1) {
                for (col = 0; col < maxColumn; col += 1) {
                    isForbidden[col] = false;
                }
                for (j = 0; j < i; j += 1) {
                    if (overlap(events[i], events[j])) {
                        isForbidden[events[j].position] = true;
                    }
                }
                for (col = 0; col < maxColumn; col += 1) {
                    if (!isForbidden[col]) {
                        break;
                    }
                }
                if (col < maxColumn) {
                    events[i].position = col;
                } else {
                    events[i].position = maxColumn++;
                }
            }
        }

        function calculateWidth(orderedEvents) {
            var cells = new Array(24),
                event,
                index,
                i,
                j,
                len,
                eventCountInCell,
                currentEventInCell;

            //sort by position in descending order, the right most columns should be calculated first
            orderedEvents.sort(function (eventA, eventB) {
                return eventB.position - eventA.position;
            });
            for (i = 0; i < 24; i += 1) {
                cells[i] = {
                    calculated: false,
                    events: []
                };
            }
            len = orderedEvents.length;
            for (i = 0; i < len; i += 1) {
                event = orderedEvents[i];
                index = event.startIndex;
                while (index < event.endIndex) {
                    cells[index].events.push(event);
                    index += 1;
                }
            }

            i = 0;
            while (i < len) {
                event = orderedEvents[i];
                if (!event.overlapNumber) {
                    var overlapNumber = event.position + 1;
                    event.overlapNumber = overlapNumber;
                    var eventQueue = [event];
                    while ((event = eventQueue.shift())) {
                        index = event.startIndex;
                        while (index < event.endIndex) {
                            if (!cells[index].calculated) {
                                cells[index].calculated = true;
                                if (cells[index].events) {
                                    eventCountInCell = cells[index].events.length;
                                    for (j = 0; j < eventCountInCell; j += 1) {
                                        currentEventInCell = cells[index].events[j];
                                        if (!currentEventInCell.overlapNumber) {
                                            currentEventInCell.overlapNumber = overlapNumber;
                                            eventQueue.push(currentEventInCell);
                                        }
                                    }
                                }
                            }
                            index += 1;
                        }
                    }
                }
                i += 1;
            }
        }

        function getAdjacentCalendarDate(currentCalendarDate, direction) {
            var step = self.mode.step,
                calculateCalendarDate = new Date(currentCalendarDate),
                year = calculateCalendarDate.getFullYear() + direction * (step.years || 0),
                month = calculateCalendarDate.getMonth() + direction * (step.months || 0),
                date = calculateCalendarDate.getDate() + direction * (step.days || 0),
                firstDayInNextMonth;

            calculateCalendarDate.setFullYear(year, month, date);
            if ($scope.calendarMode === 'month') {
                firstDayInNextMonth = new Date(year, month + 1, 1);
                if (firstDayInNextMonth.getTime() <= calculateCalendarDate.getTime()) {
                    calculateCalendarDate = new Date(firstDayInNextMonth - 24 * 60 * 60 * 1000);
                }
            }
            return calculateCalendarDate;
        }

        self.init = function (ngModelCtrl_) {
            ngModelCtrl = ngModelCtrl_;

            ngModelCtrl.$render = function () {
                self.render();
            };
        };

        self.render = function () {
            if (ngModelCtrl.$modelValue) {
                var date = new Date(ngModelCtrl.$modelValue),
                    isValid = !isNaN(date);

                if (isValid) {
                    this.currentCalendarDate = date;
                } else {
                    $log.error('"ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
                }
                ngModelCtrl.$setValidity('date', isValid);
            }
            this.refreshView();
        };

        self.refreshView = function () {
            if (this.mode) {
                this.range = this._getRange(this.currentCalendarDate);
                if ($scope.titleChanged) {
                    $scope.titleChanged({title: self._getTitle()});
                }
                this._refreshView();
                this.rangeChanged();
            }
        };

        // Split array into smaller arrays
        self.split = function (arr, size) {
            var arrays = [];
            while (arr.length > 0) {
                arrays.push(arr.splice(0, size));
            }
            return arrays;
        };

        self.onEventSourceChanged = function (value) {
            self.eventSource = value;
            if (self._onDataLoaded) {
                self._onDataLoaded();
            }
        };

        self.getAdjacentViewStartTime = function (direction) {
            var adjacentCalendarDate = getAdjacentCalendarDate(self.currentCalendarDate, direction);
            return self._getRange(adjacentCalendarDate).startTime;
        };

        self.move = function (direction) {
            self.direction = direction;
            if (!self.moveOnSelected) {
                self.currentCalendarDate = getAdjacentCalendarDate(self.currentCalendarDate, direction);
            }
            ngModelCtrl.$setViewValue(self.currentCalendarDate);
            self.refreshView();
            self.direction = 0;
            self.moveOnSelected = false;
        };

        self.rangeChanged = function () {
            if (self.queryMode === 'local') {
                if (self.eventSource && self._onDataLoaded) {
                    self._onDataLoaded();
                }
            } else if (self.queryMode === 'remote') {
                if ($scope.rangeChanged) {
                    $scope.rangeChanged({
                        startTime: this.range.startTime,
                        endTime: this.range.endTime
                    });
                }
            }
        };

        self.registerSlideChanged = function (scope) {
            scope.currentViewIndex = 0;
            scope.slideChanged = function ($index) {
                $timeout(function () {
                    var currentViewIndex = scope.currentViewIndex,
                        direction = 0;
                    if ($index - currentViewIndex === 1 || ($index === 0 && currentViewIndex === 2)) {
                        direction = 1;
                    } else if (currentViewIndex - $index === 1 || ($index === 2 && currentViewIndex === 0)) {
                        direction = -1;
                    }
                    currentViewIndex = $index;
                    scope.currentViewIndex = currentViewIndex;
                    self.move(direction);
                    scope.$digest();
                }, 200);
            };
        };

        self.populateAdjacentViews = function (scope) {
            var currentViewStartDate,
                currentViewData,
                toUpdateViewIndex,
                currentViewIndex = scope.currentViewIndex,
                getViewData = this._getViewData;

            if (self.direction === 1) {
                currentViewStartDate = self.getAdjacentViewStartTime(1);
                toUpdateViewIndex = (currentViewIndex + 1) % 3;
                angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
            } else if (self.direction === -1) {
                currentViewStartDate = self.getAdjacentViewStartTime(-1);
                toUpdateViewIndex = (currentViewIndex + 2) % 3;
                angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
            } else {
                if (!scope.views) {
                    currentViewData = [];
                    currentViewStartDate = self.range.startTime;
                    currentViewData.push(getViewData(currentViewStartDate));
                    currentViewStartDate = self.getAdjacentViewStartTime(1);
                    currentViewData.push(getViewData(currentViewStartDate));
                    currentViewStartDate = self.getAdjacentViewStartTime(-1);
                    currentViewData.push(getViewData(currentViewStartDate));
                    scope.views = currentViewData;
                } else {
                    currentViewStartDate = self.range.startTime;
                    angular.copy(getViewData(currentViewStartDate), scope.views[currentViewIndex]);
                    currentViewStartDate = self.getAdjacentViewStartTime(-1);
                    toUpdateViewIndex = (currentViewIndex + 2) % 3;
                    angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
                    currentViewStartDate = self.getAdjacentViewStartTime(1);
                    toUpdateViewIndex = (currentViewIndex + 1) % 3;
                    angular.copy(getViewData(currentViewStartDate), scope.views[toUpdateViewIndex]);
                }
            }
        };

        self.placeEvents = function (orderedEvents) {
            calculatePosition(orderedEvents);
            calculateWidth(orderedEvents);
        };

        self.placeAllDayEvents = function (orderedEvents) {
            calculatePosition(orderedEvents);
        };

        self.slideView = function (direction) {
            var slideHandle = $ionicSlideBoxDelegate.$getByHandle($scope.calendarMode + 'view-slide');

            if (slideHandle) {
                if (direction === 1) {
                    slideHandle.next();
                } else if (direction === -1) {
                    slideHandle.previous();
                }
            }
        };
    }])
    .directive('calendar', function () {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/calendar.html',
            scope: {
                calendarMode: '=',
                rangeChanged: '&',
                eventSelected: '&',
                timeSelected: '&',
                titleChanged: '&',
                isDateDisabled: '&'
            },
            require: ['calendar', '?^ngModel'],
            controller: 'ui.rCalendar.CalendarController',
            link: function (scope, element, attrs, ctrls) {
                var calendarCtrl = ctrls[0], ngModelCtrl = ctrls[1];

                if (ngModelCtrl) {
                    calendarCtrl.init(ngModelCtrl);
                }

                scope.$on('changeDate', function (event, direction) {
                    calendarCtrl.slideView(direction);
                });

                scope.$on('eventSourceChanged', function (event, value) {
                    calendarCtrl.onEventSourceChanged(value);
                });
            }
        };
    })
    .directive('monthview', ['dateFilter', function (dateFilter) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/month.html',
            require: ['^calendar', '?^ngModel'],
            link: function (scope, element, attrs, ctrls) {
                var ctrl = ctrls[0],
                    ngModelCtrl = ctrls[1];
                scope.showEventDetail = ctrl.showEventDetail;
                scope.formatDayHeader = ctrl.formatDayHeader;
                scope.autoSelect = ctrl.autoSelect;

                ctrl.mode = {
                    step: {months: 1}
                };

                scope.noEventsLabel = ctrl.noEventsLabel;
                scope.displayEventTemplateUrl = ctrl.monthviewDisplayEventTemplateUrl;
                scope.eventDetailTemplateUrl = ctrl.monthviewEventDetailTemplateUrl;

                function getDates(startDate, n) {
                    var dates = new Array(n), current = new Date(startDate), i = 0;
                    current.setHours(12); // Prevent repeated dates because of timezone bug
                    while (i < n) {
                        dates[i++] = new Date(current);
                        current.setDate(current.getDate() + 1);
                    }
                    return dates;
                }

                function createDateObject(date, format) {
                    var dateObject = {
                        date: date,
                        label: dateFilter(date, format)
                    };

                    if (scope.isDateDisabled) {
                        dateObject.disabled = scope.isDateDisabled({date: date});
                    }

                    return dateObject;
                }

                function updateCurrentView(currentViewStartDate, view) {
                    var currentCalendarDate = ctrl.currentCalendarDate,
                        today = new Date(),
                        oneDay = 86400000,
                        r,
                        selectedDayDifference = Math.floor((currentCalendarDate.getTime() - currentViewStartDate.getTime()) / oneDay),
                        currentDayDifference = Math.floor((today.getTime() - currentViewStartDate.getTime()) / oneDay);

                    for (r = 0; r < 42; r += 1) {
                        view.dates[r].selected = false;
                    }

                    if (selectedDayDifference >= 0 && selectedDayDifference < 42 && (scope.autoSelect || ctrl.moveOnSelected)) {
                        view.dates[selectedDayDifference].selected = true;
                        scope.selectedDate = view.dates[selectedDayDifference];
                    } else {
                        scope.selectedDate = {
                            events: []
                        };
                    }

                    if (currentDayDifference >= 0 && currentDayDifference < 42) {
                        view.dates[currentDayDifference].current = true;
                    }
                }

                function compareEvent(event1, event2) {
                    if (event1.allDay) {
                        return 1;
                    } else if (event2.allDay) {
                        return -1;
                    } else {
                        return (event1.startTime.getTime() - event2.startTime.getTime());
                    }
                }

                scope.select = function (viewDate) {
                    var selectedDate = viewDate.date,
                        events = viewDate.events,
                        views = scope.views,
                        dates,
                        r;
                    if (views) {
                        dates = views[scope.currentViewIndex].dates;
                        var currentCalendarDate = ctrl.currentCalendarDate;
                        var currentMonth = currentCalendarDate.getMonth();
                        var currentYear = currentCalendarDate.getFullYear();
                        var selectedMonth = selectedDate.getMonth();
                        var selectedYear = selectedDate.getFullYear();
                        var direction = 0;
                        if (currentYear === selectedYear) {
                            if (currentMonth !== selectedMonth) {
                                direction = currentMonth < selectedMonth ? 1 : -1;
                            }
                        } else {
                            direction = currentYear < selectedYear ? 1 : -1;
                        }

                        ctrl.currentCalendarDate = selectedDate;
                        if (direction === 0) {
                            if (ngModelCtrl) {
                                ngModelCtrl.$setViewValue(selectedDate);
                            }
                            var currentViewStartDate = ctrl.range.startTime,
                                oneDay = 86400000,
                                selectedDayDifference = Math.floor((selectedDate.getTime() - currentViewStartDate.getTime()) / oneDay);
                            for (r = 0; r < 42; r += 1) {
                                dates[r].selected = false;
                            }

                            if (selectedDayDifference >= 0 && selectedDayDifference < 42) {
                                dates[selectedDayDifference].selected = true;
                                scope.selectedDate = dates[selectedDayDifference];
                            }
                        } else {
                            ctrl.moveOnSelected = true;
                            ctrl.slideView(direction);
                        }

                        if (scope.timeSelected) {
                            scope.timeSelected({
                                selectedTime: selectedDate,
                                events: events,
                                disabled: viewDate.disabled || false
                            });
                        }
                    }
                };

                scope.getHighlightClass = function (date) {
                    var className = '';

                    if (date.hasEvent) {
                        if (date.secondary) {
                            className = 'monthview-secondary-with-event';
                        } else {
                            className = 'monthview-primary-with-event';
                        }
                    }

                    if (date.selected) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'monthview-selected';
                    }

                    if (date.current) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'monthview-current';
                    }

                    if (date.secondary) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'text-muted';
                    }

                    if (date.disabled) {
                        if (className) {
                            className += ' ';
                        }
                        className += 'monthview-disabled';
                    }
                    return className;
                };

                ctrl._getTitle = function () {
                    var currentViewStartDate = ctrl.range.startTime,
                        date = currentViewStartDate.getDate(),
                        month = (currentViewStartDate.getMonth() + (date !== 1 ? 1 : 0)) % 12,
                        year = currentViewStartDate.getFullYear() + (date !== 1 && month === 0 ? 1 : 0),
                        headerDate = new Date(year, month, 1);
                    return dateFilter(headerDate, ctrl.formatMonthTitle);
                };

                ctrl._getViewData = function (startTime) {
                    var startDate = startTime,
                        date = startDate.getDate(),
                        month = (startDate.getMonth() + (date !== 1 ? 1 : 0)) % 12;

                    var days = getDates(startDate, 42);
                    for (var i = 0; i < 42; i++) {
                        days[i] = angular.extend(createDateObject(days[i], ctrl.formatDay), {
                            secondary: days[i].getMonth() !== month
                        });
                    }

                    return {
                        dates: days
                    };
                };

                ctrl._refreshView = function () {
                    ctrl.populateAdjacentViews(scope);
                    updateCurrentView(ctrl.range.startTime, scope.views[scope.currentViewIndex]);
                };

                ctrl._onDataLoaded = function () {
                    var eventSource = ctrl.eventSource,
                        len = eventSource ? eventSource.length : 0,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        utcStartTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())),
                        utcEndTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(), endTime.getDate())),
                        currentViewIndex = scope.currentViewIndex,
                        dates = scope.views[currentViewIndex].dates,
                        oneDay = 86400000,
                        eps = 0.001;

                    for (var r = 0; r < 42; r += 1) {
                        if (dates[r].hasEvent) {
                            dates[r].hasEvent = false;
                            dates[r].events = [];
                        }
                    }

                    for (var i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);
                        var st;
                        var et;

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                st = utcStartTime;
                                et = utcEndTime;
                            }
                        } else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                st = startTime;
                                et = endTime;
                            }
                        }

                        var timeDiff;
                        var timeDifferenceStart;
                        if (eventStartTime <= st) {
                            timeDifferenceStart = 0;
                        } else {
                            timeDiff = eventStartTime - st;
                            if (!event.allDay) {
                                timeDiff = timeDiff - (eventStartTime.getTimezoneOffset() - st.getTimezoneOffset()) * 60000;
                            }
                            timeDifferenceStart = timeDiff / oneDay;
                        }

                        var timeDifferenceEnd;
                        if (eventEndTime >= et) {
                            timeDiff = et - st;
                            if (!event.allDay) {
                                timeDiff = timeDiff - (et.getTimezoneOffset() - st.getTimezoneOffset()) * 60000;
                            }
                            timeDifferenceEnd = timeDiff / oneDay;
                        } else {
                            timeDiff = eventEndTime - st;
                            if (!event.allDay) {
                                timeDiff = timeDiff - (eventEndTime.getTimezoneOffset() - st.getTimezoneOffset()) * 60000;
                            }
                            timeDifferenceEnd = timeDiff / oneDay;
                        }

                        var index = Math.floor(timeDifferenceStart);
                        var eventSet;
                        while (index < timeDifferenceEnd - eps) {
                            dates[index].hasEvent = true;
                            eventSet = dates[index].events;
                            if (eventSet) {
                                eventSet.push(event);
                            } else {
                                eventSet = [];
                                eventSet.push(event);
                                dates[index].events = eventSet;
                            }
                            index += 1;
                        }
                    }

                    for (r = 0; r < 42; r += 1) {
                        if (dates[r].hasEvent) {
                            dates[r].events.sort(compareEvent);
                        }
                    }

                    if(scope.autoSelect) {
                        var findSelected = false;
                        for (r = 0; r < 42; r += 1) {
                            if (dates[r].selected) {
                                scope.selectedDate = dates[r];
                                findSelected = true;
                                break;
                            }
                            if (findSelected) {
                                break;
                            }
                        }
                    }
                };

                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        firstDayOfMonth = new Date(year, month, 1),
                        difference = ctrl.startingDayMonth - firstDayOfMonth.getDay(),
                        numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : -difference,
                        startDate = new Date(firstDayOfMonth),
                        endDate;

                    if (numDisplayedFromPreviousMonth > 0) {
                        startDate.setDate(-numDisplayedFromPreviousMonth + 1);
                    }

                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 42);

                    return {
                        startTime: startDate,
                        endTime: endDate
                    };
                };

                ctrl.registerSlideChanged(scope);

                ctrl.refreshView();
            }
        };
    }])
    .directive('weekview', ['dateFilter', function (dateFilter) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/week.html',
            require: '^calendar',
            link: function (scope, element, attrs, ctrl) {
                scope.formatWeekViewDayHeader = ctrl.formatWeekViewDayHeader;
                scope.formatHourColumn = ctrl.formatHourColumn;

                ctrl.mode = {
                    step: {days: 7}
                };

                scope.allDayLabel = ctrl.allDayLabel;
                scope.hourParts = ctrl.hourParts;
                scope.allDayEventTemplateUrl = ctrl.weekviewAllDayEventTemplateUrl;
                scope.normalEventTemplateUrl = ctrl.weekviewNormalEventTemplateUrl;

                function getDates(startTime, n) {
                    var dates = new Array(n),
                        current = new Date(startTime),
                        i = 0;
                    current.setHours(12); // Prevent repeated dates because of timezone bug
                    while (i < n) {
                        dates[i++] = {
                            date: new Date(current)
                        };
                        current.setDate(current.getDate() + 1);
                    }
                    return dates;
                }

                function createDateObjects(startTime) {
                    var times = [],
                        row,
                        time,
                        currentHour = startTime.getHours(),
                        currentDate = startTime.getDate();

                    for (var hour = 0; hour < 24; hour += 1) {
                        row = [];
                        for (var day = 0; day < 7; day += 1) {
                            time = new Date(startTime.getTime());
                            time.setHours(currentHour + hour);
                            time.setDate(currentDate + day);
                            row.push({
                                time: time
                            });
                        }
                        times.push(row);
                    }
                    return times;
                }

                function compareEventByStartOffset(eventA, eventB) {
                    return eventA.startOffset - eventB.startOffset;
                }

                //This can be decomissioned when upgrade to Angular 1.3
                function getISO8601WeekNumber(date) {
                    var checkDate = new Date(date);
                    checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
                    var time = checkDate.getTime();
                    checkDate.setMonth(0); // Compare with Jan 1
                    checkDate.setDate(1);
                    return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
                }

                ctrl._getTitle = function () {
                    var firstDayOfWeek = ctrl.range.startTime,
                        weekNumberIndex,
                        weekFormatPattern = 'w',
                        title;

                    weekNumberIndex = ctrl.formatWeekTitle.indexOf(weekFormatPattern);
                    title = dateFilter(firstDayOfWeek, ctrl.formatWeekTitle);
                    if (weekNumberIndex !== -1) {
                        title = title.replace(weekFormatPattern, getISO8601WeekNumber(firstDayOfWeek));
                    }

                    return title;
                };

                scope.select = function (selectedTime, events) {
                    if (scope.timeSelected) {
                        var disabled;
                        if (scope.isDateDisabled) {
                            disabled = scope.isDateDisabled({date: selectedTime});
                        }
                        scope.timeSelected({selectedTime: selectedTime, events: events, disabled: disabled || false});
                    }
                };

                ctrl._getViewData = function (startTime) {
                    return {
                        rows: createDateObjects(startTime),
                        dates: getDates(startTime, 7)
                    };
                };

                ctrl._refreshView = function () {
                    ctrl.populateAdjacentViews(scope);
                };

                ctrl._onDataLoaded = function () {
                    var eventSource = ctrl.eventSource,
                        i,
                        day,
                        hour,
                        len = eventSource ? eventSource.length : 0,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        utcStartTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())),
                        utcEndTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(), endTime.getDate())),
                        currentViewIndex = scope.currentViewIndex,
                        rows = scope.views[currentViewIndex].rows,
                        dates = scope.views[currentViewIndex].dates,
                        oneHour = 3600000,
                        oneDay = 86400000,
                    //add allday eps
                        eps = 0.016,
                        eventSet,
                        allDayEventInRange = false,
                        normalEventInRange = false;

                    for (i = 0; i < 7; i += 1) {
                        dates[i].events = [];
                    }

                    for (day = 0; day < 7; day += 1) {
                        for (hour = 0; hour < 24; hour += 1) {
                            rows[hour][day].events = [];
                        }
                    }
                    for (i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                allDayEventInRange = true;

                                var allDayStartIndex;
                                if (eventStartTime <= utcStartTime) {
                                    allDayStartIndex = 0;
                                } else {
                                    allDayStartIndex = Math.floor((eventStartTime - utcStartTime) / oneDay);
                                }

                                var allDayEndIndex;
                                if (eventEndTime >= utcEndTime) {
                                    allDayEndIndex = Math.ceil((utcEndTime - utcStartTime) / oneDay);
                                } else {
                                    allDayEndIndex = Math.ceil((eventEndTime - utcStartTime) / oneDay);
                                }

                                var displayAllDayEvent = {
                                    event: event,
                                    startIndex: allDayStartIndex,
                                    endIndex: allDayEndIndex
                                };

                                eventSet = dates[allDayStartIndex].events;
                                if (eventSet) {
                                    eventSet.push(displayAllDayEvent);
                                } else {
                                    eventSet = [];
                                    eventSet.push(displayAllDayEvent);
                                    dates[allDayStartIndex].events = eventSet;
                                }
                            }
                        } else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                normalEventInRange = true;

                                var timeDiff;
                                var timeDifferenceStart;
                                if (eventStartTime <= startTime) {
                                    timeDifferenceStart = 0;
                                } else {
                                    timeDiff = eventStartTime - startTime - (eventStartTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                    timeDifferenceStart = timeDiff / oneHour;
                                }

                                var timeDifferenceEnd;
                                if (eventEndTime >= endTime) {
                                    timeDiff = endTime - startTime - (endTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                    timeDifferenceEnd = timeDiff / oneHour;
                                } else {
                                    timeDiff = eventEndTime - startTime - (eventEndTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                    timeDifferenceEnd = timeDiff / oneHour;
                                }

                                var startIndex = Math.floor(timeDifferenceStart);
                                var endIndex = Math.ceil(timeDifferenceEnd - eps);
                                var startRowIndex = startIndex % 24;
                                var dayIndex = Math.floor(startIndex / 24);
                                var endOfDay = dayIndex * 24;
                                var endRowIndex;
                                var startOffset = 0;
                                var endOffset = 0;
                                if (ctrl.hourParts !== 1) {
                                    startOffset = Math.floor((timeDifferenceStart - startIndex) * ctrl.hourParts);
                                }

                                do {
                                    endOfDay += 24;
                                    if (endOfDay <= endIndex) {
                                        endRowIndex = 24;
                                    } else {
                                        endRowIndex = endIndex % 24;
                                        if (ctrl.hourParts !== 1) {
                                            endOffset = Math.floor((endIndex - timeDifferenceEnd) * ctrl.hourParts);
                                        }
                                    }
                                    var displayEvent = {
                                        event: event,
                                        startIndex: startRowIndex,
                                        endIndex: endRowIndex,
                                        startOffset: startOffset,
                                        endOffset: endOffset
                                    };
                                    eventSet = rows[startRowIndex][dayIndex].events;
                                    if (eventSet) {
                                        eventSet.push(displayEvent);
                                    } else {
                                        eventSet = [];
                                        eventSet.push(displayEvent);
                                        rows[startRowIndex][dayIndex].events = eventSet;
                                    }
                                    startRowIndex = 0;
                                    startOffset = 0;
                                    dayIndex += 1;
                                } while (endOfDay < endIndex);
                            }
                        }
                    }

                    if (normalEventInRange) {
                        for (day = 0; day < 7; day += 1) {
                            var orderedEvents = [];
                            for (hour = 0; hour < 24; hour += 1) {
                                if (rows[hour][day].events) {
                                    rows[hour][day].events.sort(compareEventByStartOffset);

                                    orderedEvents = orderedEvents.concat(rows[hour][day].events);
                                }
                            }
                            if (orderedEvents.length > 0) {
                                ctrl.placeEvents(orderedEvents);
                            }
                        }
                    }

                    if (allDayEventInRange) {
                        var orderedAllDayEvents = [];
                        for (day = 0; day < 7; day += 1) {
                            if (dates[day].events) {
                                orderedAllDayEvents = orderedAllDayEvents.concat(dates[day].events);
                            }
                        }
                        if (orderedAllDayEvents.length > 0) {
                            ctrl.placeAllDayEvents(orderedAllDayEvents);
                        }
                    }
                };

                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        date = currentDate.getDate(),
                        day = currentDate.getDay(),
                        difference = day - ctrl.startingDayWeek,
                        firstDayOfWeek,
                        endTime;

                    if (difference < 0) {
                        difference += 7;
                    }

                    firstDayOfWeek = new Date(year, month, date - difference);
                    endTime = new Date(year, month, date - difference + 7);

                    return {
                        startTime: firstDayOfWeek,
                        endTime: endTime
                    };
                };

                ctrl.registerSlideChanged(scope);

                ctrl.refreshView();
            }
        };
    }])
    .directive('dayview', ['dateFilter', function (dateFilter) {
        'use strict';
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/rcalendar/day.html',
            require: '^calendar',
            link: function (scope, element, attrs, ctrl) {
                scope.formatHourColumn = ctrl.formatHourColumn;

                ctrl.mode = {
                    step: {days: 1}
                };

                scope.allDayLabel = ctrl.allDayLabel;
                scope.hourParts = ctrl.hourParts;
                scope.allDayEventTemplateUrl = ctrl.dayviewAllDayEventTemplateUrl;
                scope.normalEventTemplateUrl = ctrl.dayviewNormalEventTemplateUrl;

                function createDateObjects(startTime) {
                    var rows = [],
                        time,
                        currentHour = startTime.getHours(),
                        currentDate = startTime.getDate();

                    for (var hour = 0; hour < 24; hour += 1) {
                        time = new Date(startTime.getTime());
                        time.setHours(currentHour + hour);
                        time.setDate(currentDate);
                        rows.push({
                            time: time
                        });
                    }
                    return rows;
                }

                function compareEventByStartOffset(eventA, eventB) {
                    return eventA.startOffset - eventB.startOffset;
                }

                scope.select = function (selectedTime, events) {
                    if (scope.timeSelected) {
                        var disabled;
                        if (scope.isDateDisabled) {
                            disabled = scope.isDateDisabled({date: selectedTime});
                        }
                        scope.timeSelected({selectedTime: selectedTime, events: events, disabled: disabled || false});
                    }
                };

                ctrl._onDataLoaded = function () {
                    var eventSource = ctrl.eventSource,
                        hour,
                        len = eventSource ? eventSource.length : 0,
                        startTime = ctrl.range.startTime,
                        endTime = ctrl.range.endTime,
                        utcStartTime = new Date(Date.UTC(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())),
                        utcEndTime = new Date(Date.UTC(endTime.getFullYear(), endTime.getMonth(), endTime.getDate())),
                        currentViewIndex = scope.currentViewIndex,
                        rows = scope.views[currentViewIndex].rows,
                        allDayEvents = scope.views[currentViewIndex].allDayEvents = [],
                        oneHour = 3600000,
                        eps = 0.016,
                        eventSet,
                        normalEventInRange = false;

                    for (hour = 0; hour < 24; hour += 1) {
                        rows[hour].events = [];
                    }

                    for (var i = 0; i < len; i += 1) {
                        var event = eventSource[i];
                        var eventStartTime = new Date(event.startTime);
                        var eventEndTime = new Date(event.endTime);

                        if (event.allDay) {
                            if (eventEndTime <= utcStartTime || eventStartTime >= utcEndTime) {
                                continue;
                            } else {
                                allDayEvents.push({
                                    event: event
                                });
                            }
                        } else {
                            if (eventEndTime <= startTime || eventStartTime >= endTime) {
                                continue;
                            } else {
                                normalEventInRange = true;
                            }

                            var timeDiff;
                            var timeDifferenceStart;
                            if (eventStartTime <= startTime) {
                                timeDifferenceStart = 0;
                            } else {
                                timeDiff = eventStartTime - startTime - (eventStartTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                timeDifferenceStart = timeDiff / oneHour;
                            }

                            var timeDifferenceEnd;
                            if (eventEndTime >= endTime) {
                                timeDiff = endTime - startTime - (endTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                timeDifferenceEnd = timeDiff / oneHour;
                            } else {
                                timeDiff = eventEndTime - startTime - (eventEndTime.getTimezoneOffset() - startTime.getTimezoneOffset()) * 60000;
                                timeDifferenceEnd = timeDiff / oneHour;
                            }

                            var startIndex = Math.floor(timeDifferenceStart);
                            var endIndex = Math.ceil(timeDifferenceEnd - eps);
                            var startOffset = 0;
                            var endOffset = 0;
                            if (ctrl.hourParts !== 1) {
                                startOffset = Math.floor((timeDifferenceStart - startIndex) * ctrl.hourParts);
                                endOffset = Math.floor((endIndex - timeDifferenceEnd) * ctrl.hourParts);
                            }

                            var displayEvent = {
                                event: event,
                                startIndex: startIndex,
                                endIndex: endIndex,
                                startOffset: startOffset,
                                endOffset: endOffset
                            };

                            eventSet = rows[startIndex].events;
                            if (eventSet) {
                                eventSet.push(displayEvent);
                            } else {
                                eventSet = [];
                                eventSet.push(displayEvent);
                                rows[startIndex].events = eventSet;
                            }
                        }
                    }

                    if (normalEventInRange) {
                        var orderedEvents = [];
                        for (hour = 0; hour < 24; hour += 1) {
                            if (rows[hour].events) {
                                rows[hour].events.sort(compareEventByStartOffset);

                                orderedEvents = orderedEvents.concat(rows[hour].events);
                            }
                        }
                        if (orderedEvents.length > 0) {
                            ctrl.placeEvents(orderedEvents);
                        }
                    }
                };

                ctrl._refreshView = function () {
                    ctrl.populateAdjacentViews(scope);
                };

                ctrl._getTitle = function () {
                    var startingDate = ctrl.range.startTime;
                    return dateFilter(startingDate, ctrl.formatDayTitle);
                };

                ctrl._getViewData = function (startTime) {
                    return {
                        rows: createDateObjects(startTime),
                        allDayEvents: []
                    };
                };

                ctrl._getRange = function getRange(currentDate) {
                    var year = currentDate.getFullYear(),
                        month = currentDate.getMonth(),
                        date = currentDate.getDate(),
                        startTime = new Date(year, month, date),
                        endTime = new Date(year, month, date + 1);

                    return {
                        startTime: startTime,
                        endTime: endTime
                    };
                };

                ctrl.registerSlideChanged(scope);

                ctrl.refreshView();
            }
        };
    }]);
