import React, { useState } from 'react';
import { DateRangePicker } from 'react-date-range';
import { format } from 'date-fns';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import 'react-date-range/dist/styles.css'; // main css file
import 'react-date-range/dist/theme/default.css'; // theme css file
import './datePicker.css';

const DateRangePickerComponent = ({ dates, setDates }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectionRange, setSelectionRange] = useState({
    startDate: dates.startDate,
    endDate: dates.endDate,
    key: 'selection',
  });

  const handleSelect = (ranges) => {
    setSelectionRange(ranges.selection);
    setDates({
      startDate: ranges.selection.startDate,
      endDate: ranges.selection.endDate,
    });
  };

  const formattedDate = `${format(selectionRange.startDate, 'EEE d MMM')} - ${selectionRange.endDate ? format(selectionRange.endDate, 'EEE d MMM') : 'Check-out'}`;

  return (
    <div className="date-range-picker input-icon-container">
      <input
        id="date-input"
        type="text"
        value={formattedDate}
        readOnly
        onClick={() => setShowCalendar(!showCalendar)}
        className="date-picker-input"
      />
      <CalendarMonthIcon className="input-icon" id="calendar-icon"/>
      {showCalendar && (
        <div className="calendar-container" id="calendar-container">
          <DateRangePicker
            ranges={[selectionRange]}
            onChange={handleSelect}
            moveRangeOnFirstSelection={false}
            className="calendar-element"
            id="date-range-picker"
          />
          <button
            className="apply-button"
            id="apply-button"
            onClick={() => setShowCalendar(false)}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default DateRangePickerComponent;
