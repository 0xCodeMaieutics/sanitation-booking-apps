# Days pause on Pending Callback Requests, not a global switch

The first brief had the Admin pause and resume all booking by hand, with every Booking pausing the app until the Admin resumed it. We dropped that: time is blocked by each Booking's Duration, and only a Pending Callback Request for a Custom Service pauses booking, for its desired day only. Clients see a Callback Request form on a Paused Day; the day un-pauses when the Admin accepts the request (turning it into a Booking with an Estimated Duration) or declines it.

## Considered Options

- **Global pause/resume switch.** Rejected: one Booking would stop every other day from being booked, and the Admin would have to remember to resume.
- **Clients book Custom Services directly and the Admin estimates afterwards.** Rejected: the Admin needs to talk to the Client and decide whether to take the job, and whether to let it overlap other Bookings, before it holds any time.
- **Global switch alongside per-day pausing.** Deferred: Time Off already covers "we are not working then".

## Consequences

- One Callback Request can pause a whole day, so Clients verify their phone by SMS and may hold only one Pending Callback Request with a desired start time.
