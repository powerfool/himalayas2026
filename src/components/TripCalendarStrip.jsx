import { useState, useEffect, useRef } from 'react';
import {
  dateForDay,
  getSegmentLabel,
  getMaxDay,
  formatDayLabel
} from '../utils/calendarHelpers';

const WINDOW_BUFFER_DAYS = 3;
const NOTE_TRUNCATE_LEN = 40;

function truncateNote(text) {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  if (t.length <= NOTE_TRUNCATE_LEN) return t;
  return t.slice(0, NOTE_TRUNCATE_LEN) + '…';
}

function formatDistance(m) {
  if (m == null) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

/**
 * Build list of day entries for the strip: { dayNumber, date, isTripDay }.
 * When tripStartDate is set, includes buffer days before/after.
 */
function getDayEntries(segmentDays, tripStartDate) {
  const maxDay = getMaxDay(segmentDays);
  if (maxDay === 0) return [];

  const entries = [];
  if (tripStartDate) {
    const tripStart = dateForDay(tripStartDate, 1);
    const tripEnd = dateForDay(tripStartDate, maxDay);
    const first = new Date(tripStart);
    first.setDate(first.getDate() - WINDOW_BUFFER_DAYS);
    const last = new Date(tripEnd);
    last.setDate(last.getDate() + WINDOW_BUFFER_DAYS);
    const cursor = new Date(first);
    while (cursor <= last) {
      const dayNum = Math.round((cursor - tripStart) / (24 * 60 * 60 * 1000)) + 1;
      const isTripDay = dayNum >= 1 && dayNum <= maxDay;
      entries.push({
        dayNumber: isTripDay ? dayNum : null,
        date: new Date(cursor),
        isTripDay
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    for (let d = 1; d <= maxDay; d++) {
      entries.push({ dayNumber: d, date: null, isTripDay: true });
    }
  }
  return entries;
}

/**
 * Get segments that fall on a given trip day.
 */
function getSegmentsForDay(segments, segmentDays, dayNumber) {
  if (!dayNumber) return [];
  return segments
    .map((seg, i) => ({ segment: seg, index: i, day: segmentDays[i] }))
    .filter(({ day }) => day === dayNumber)
    .map(({ segment, index }) => ({ segment, index }));
}

export default function TripCalendarStrip({
  segments = [],
  waypoints = [],
  segmentDays = [],
  tripStartDate,
  dayNotes = {},
  onDayNotesChange
}) {
  const [viewMode, setViewMode] = useState('list'); // 'calendar' | 'list'
  const [openDayNumber, setOpenDayNumber] = useState(null);
  const [popoverEditValue, setPopoverEditValue] = useState('');
  const popoverRef = useRef(null);
  const maxDay = getMaxDay(segmentDays);
  const dayEntries = getDayEntries(segmentDays, tripStartDate);

  useEffect(() => {
    if (openDayNumber != null) {
      const note = dayNotes[String(openDayNumber)];
      setPopoverEditValue(note != null ? note : '');
    }
  }, [openDayNumber, dayNotes]);

  useEffect(() => {
    if (openDayNumber == null) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpenDayNumber(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openDayNumber]);

  if (segments.length === 0) {
    return (
      <div style={{
        padding: '24px',
        color: '#6b7280',
        textAlign: 'center',
        backgroundColor: '#f9fafb',
        height: '100%'
      }}>
        Calculate the route first, then assign trip days to see the calendar.
      </div>
    );
  }

  const tripStart = tripStartDate ? dateForDay(tripStartDate, 1) : null;
  const tripEnd = tripStartDate && maxDay > 0 ? dateForDay(tripStartDate, maxDay) : null;

  const dayContent = (entry) => {
    const { dayNumber, date, isTripDay } = entry;
    const label = isTripDay && dayNumber
      ? (tripStartDate ? formatDayLabel(tripStartDate, dayNumber) : `Day ${dayNumber}`)
      : '';
    const bufferLabel = date && !isTripDay
      ? (tripStart && date < tripStart ? ' (before trip)' : tripEnd && date > tripEnd ? ' (after trip)' : '')
      : '';
    const items = dayNumber ? getSegmentsForDay(segments, segmentDays, dayNumber) : [];
    const title = isTripDay ? label : (date ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + bufferLabel : '');
    return (
      <div key={entry.date ? entry.date.toISOString() : `day-${dayNumber}`}>
        <div style={{
          fontWeight: '600',
          fontSize: '13px',
          color: isTripDay ? '#111827' : '#9ca3af',
          marginBottom: '6px'
        }}>
          {title}
        </div>
        {items.length === 0 && isTripDay ? (
          <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No movement</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#374151' }}>
            {items.map(({ segment, index }) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {getSegmentLabel(segment, waypoints)}
                {segment.distance != null && (
                  <span style={{ color: '#6b7280', marginLeft: '6px' }}>
                    {formatDistance(segment.distance)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {isTripDay && dayNumber && (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOpenDayNumber(dayNumber)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenDayNumber(dayNumber); } }}
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {dayNotes[String(dayNumber)] ? (
                <>
                  <span aria-hidden style={{ opacity: 0.8 }}>📝</span>
                  <span>{truncateNote(dayNotes[String(dayNumber)])}</span>
                </>
              ) : (
                <span style={{ textDecoration: 'underline' }}>Add note</span>
              )}
            </div>
            {openDayNumber === dayNumber && (
              <div
                ref={popoverRef}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 10,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '12px', color: '#374151', marginBottom: '6px' }}>
                  {tripStartDate ? formatDayLabel(tripStartDate, dayNumber) : `Day ${dayNumber}`}
                </div>
                <textarea
                  value={popoverEditValue}
                  onChange={(e) => setPopoverEditValue(e.target.value)}
                  placeholder="Note for this day…"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onDayNotesChange) onDayNotesChange(dayNumber, popoverEditValue);
                    setOpenDayNumber(null);
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      backgroundColor: '#f9fafb',
      padding: '8px 16px 16px 16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {maxDay > 0 && (
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            Duration: {maxDay} day{maxDay !== 1 ? 's' : ''} (Day 1 – Day {maxDay})
          </span>
        )}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: viewMode === 'list' ? '#3b82f6' : 'white',
              color: viewMode === 'list' ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              backgroundColor: viewMode === 'calendar' ? '#3b82f6' : 'white',
              color: viewMode === 'calendar' ? 'white' : '#374151',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {dayEntries.map((entry) => (
            <div
              key={entry.date ? entry.date.toISOString() : `day-${entry.dayNumber}`}
              style={{
                position: 'relative',
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            >
              {dayContent(entry)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
          gap: '12px'
        }}
        >
          {dayEntries.map((entry) => (
            <div
              key={entry.date ? entry.date.toISOString() : `day-${entry.dayNumber}`}
              style={{
                position: 'relative',
                padding: '12px',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                minHeight: '80px'
              }}
            >
              {dayContent(entry)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
