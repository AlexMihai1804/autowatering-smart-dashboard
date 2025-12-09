# Future Features & Improvements

## Onboarding & Configuration

### Real-time Sanity Checks
- **Problem**: Users might enter unrealistic values (e.g., huge area with low flow rate).
- **Solution**: Implement validation logic that warns the user if calculated watering times are excessive (>4 hours) or if parameters seem off.
- **Implementation**: Add a `validateZonePhysics(zoneConfig)` utility that returns warnings.

### Offline Configuration
- Allow full wizard traversal without BLE connection.
- "Sync Configuration" button at the end to write all data when connected.

### Draft Saving
- Auto-save wizard progress to `localStorage` to prevent data loss on app close/crash.
