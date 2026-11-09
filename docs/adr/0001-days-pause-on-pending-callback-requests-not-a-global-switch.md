# Days pause on Pending Callback Requests, not a global switch

The first brief had the Admin pause and resume all booking by hand, with every Booking pausing the app until the Admin resumed it. We dropped that: time is blocked by each Booking's Duration, and only Pending Callback Requests pause booking, for their own day only. A Custom Service request pauses its desired day; Clients see a Callback Request form on a Paused Day, and each request left there keeps the day paused too. The day un-pauses once the Admin has accepted (turning it into a Booking with an Estimated Duration) or declined every Pending Callback Request on it.

## Considered Options

- **Global pause/resume switch.** Rejected: one Booking would stop every other day from being booked, and the Admin would have to remember to resume.
- **Clients book Custom Services directly and the Admin estimates afterwards.** Rejected: the Admin needs to talk to the Client and decide whether to take the job, and whether to let it overlap other Bookings, before it holds any time.
- **Global switch alongside per-day pausing.** Deferred: Time Off already covers "we are not working then".
- **Only the Custom Service request pauses the day.** Rejected: once the Admin accepted it, the day reopened and a new Client could book the time a Client waiting on the Paused Day form had asked for first.

## Consequences

- One Callback Request can pause a whole day, so Clients verify their phone by SMS and may hold only one Pending Callback Request that pauses a day.
- A Client who filled in the form while the day was paused may submit it after the day reopened; their request pauses the day again rather than losing their place.
