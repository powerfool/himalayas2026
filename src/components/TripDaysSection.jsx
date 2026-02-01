import { getSegmentLabel, getMaxDay } from '../utils/calendarHelpers';

/**
 * Trip days section: trip start date, per-segment day assignment, duration.
 * Only shown when segments.length > 0.
 */
export default function TripDaysSection({
  segments = [],
  waypoints = [],
  segmentDays = [],
  tripStartDate,
  onSegmentDaysChange,
  onTripStartDateChange
}) {
  const maxDay = getMaxDay(segmentDays);
  const duration = maxDay;

  const handleSegmentDayChange = (segmentIndex, value) => {
    const num = parseInt(value, 10);
    if (Number.isNaN(num)) return;
    const minDay = segmentIndex === 0 ? 1 : segmentDays[segmentIndex - 1];
    const day = Math.max(minDay, Math.min(num, 999));
    const next = [...segmentDays];
    next[segmentIndex] = day;
    // Cascade: later segments cannot be on an earlier day than this one
    for (let j = segmentIndex + 1; j < next.length; j++) {
      next[j] = Math.max(next[j], day);
    }
    onSegmentDaysChange(next);
  };

  if (segments.length === 0) return null;

  return (
    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ marginBottom: '12px' }}>Trip days</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
          Trip start (Day 1)
        </label>
        <input
          type="date"
          value={tripStartDate ?? ''}
          onChange={(e) => onTripStartDateChange(e.target.value || null)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {duration > 0 && (
        <div style={{
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#374151'
        }}>
          Duration: {duration} day{duration !== 1 ? 's' : ''} {duration > 1 ? `(Day 1 – Day ${duration})` : ''}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {segments.map((segment, i) => {
          const label = getSegmentLabel(segment, waypoints);
          const minDay = i === 0 ? 1 : segmentDays[i - 1];
          const day = Math.max(minDay, segmentDays[i] ?? minDay);
          return (
            <div
              key={`${segment.fromWaypointId}-${segment.toWaypointId}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <div style={{ flex: 1, fontSize: '13px', minWidth: 0 }}>
                <span style={{ color: '#6b7280' }}>Segment {i + 1}:</span> {label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Day</span>
                <input
                  type="number"
                  min={minDay}
                  max={999}
                  value={day}
                  onChange={(e) => handleSegmentDayChange(i, e.target.value)}
                  style={{
                    width: '52px',
                    padding: '4px 6px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
