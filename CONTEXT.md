# Sanitation Booking

A Georgian-language booking product for a single sanitation business: Clients book a visit when the worker is free, and leave a callback request when they are not.

## Language

### People

**Admin**:
The sanitation worker, who signs in to manage Services, Bookings and Time Off. There is one business, one worker's calendar and one Admin identity tied to one Admin phone; several people or devices may be signed in as the Admin at once, each with a code sent to that phone.
_Avoid_: Worker account, staff, operator

**Client**:
A person who wants sanitation work done and uses the public app to book it or to ask for a call back. A Client has no account and is identified by their verified Georgian mobile number.
_Avoid_: User, customer, patient

**Verification Code**:
A short-lived code sent by SMS that a Client enters to prove they own their phone number before a Booking or Callback Request is made.
_Avoid_: OTP, PIN, login code

### Booking

**Booking**:
One Client's reservation of one Service at one start time on one day, at the Client's address. Clients book Standard Services themselves; every Custom Service Booking comes from the Admin accepting a Callback Request.
_Avoid_: Appointment, order, reservation, job

**Admin Booking**:
A Booking the Admin enters on a Client's behalf, for example after a phone call. It needs no Verification Code and is not bound by Minimum Notice or the Booking Window. It may overlap time another Booking occupies, but only after the Admin is warned and confirms.
_Avoid_: Manual booking, phone booking

**Booking status**:
A Booking is **Booked** (holding its time), **Completed** (marked finished by the Admin) or **Cancelled** (by the Client or the Admin). Completed and Cancelled Bookings no longer occupy time from that moment, so the start times they were holding reopen. There is no no-show status and no rescheduling; a different time means cancelling and booking again.
_Avoid_: Pending, confirmed, done, no-show

**Manage Link**:
A private link sent to the Client with their confirmation SMS that lets them view or cancel that one Booking, up to its start time, without signing in.
_Avoid_: Magic link, booking link, token

**Callback Request**:
A Client's verified request to be called back about work the Admin must agree to first. Made by choosing a Custom Service, it describes the job and carries an address and a desired start time. Made on a Paused Day, it carries the Services the Client wants (Standard, or described in their own words) and an optional note. The Admin turns it into a Booking or declines it.
_Avoid_: Custom booking, contact request, lead, inquiry, waitlist

**Callback Request status**:
A Callback Request is **Pending** (awaiting the Admin), **Accepted** (the Admin turned it into a Booking, choosing its Service, start time, Estimated Duration and Booking Price) or **Declined**. A phone number may hold only one Pending Callback Request with a desired start time.
_Avoid_: Open, handled, converted, rejected

**Paused Day**:
A day holding a Pending Callback Request's desired start time. It offers no Available Start Times, only the Callback Request form, until the Admin accepts or declines that request. There is no business-wide pause.
_Avoid_: Paused app, blocked day, closed day

### Services

**Service**:
The kind of sanitation work a Client books. It is either a Standard Service or a Custom Service.
_Avoid_: Job type, product, category

**Standard Service**:
A Service the Admin offers in advance, with a name, a fixed Duration and a Service Price. One the Admin no longer offers is Archived: hidden from Clients but kept so past Bookings still show it.
_Avoid_: Preset service, predefined service

**Custom Service**:
A Service a Client describes in their own words when no Standard Service fits. A Client cannot book one directly: they ask for it, and only the Admin turns that into a Booking, after giving it an Estimated Duration.
_Avoid_: Other, free-text service

**Duration**:
How long a Standard Service takes, in whole hours. A Booking for it occupies its start time and every later start time until the Duration has passed; it may run past the last start time of the day.
_Avoid_: Length, time needed

**Estimated Duration**:
The Admin's estimate, in whole hours, of how long a Custom Service will take, given before it becomes a Booking. In that Booking it occupies time the same way a Duration does.
_Avoid_: Estimate, ETA

### Messages

**Client Message**:
A Georgian SMS sent to a Client: their Verification Code, the confirmation of a new Booking (with its Manage Link), notice that the Admin cancelled it, or notice that their Callback Request was declined. There are no reminders.
_Avoid_: Notification, text

**Admin Alert**:
A Georgian SMS sent to the Admin's phone straight away, at any hour, when a Client books, cancels, or leaves a Callback Request (saying whether it paused a day).
_Avoid_: Notification, admin SMS

### Prices

**Service Price**:
The normal price of a Standard Service in lari, shown to Clients when they choose a Service.
_Avoid_: Base price, list price, cost

**Booking Price**:
What one Booking costs, in lari, for the Admin's own tracking; Clients never see it. It starts as the Service Price at the moment of Booking (for a Custom Service, the Admin enters it when accepting the Callback Request) and the Admin may change it at any time, for example when a job turned out bigger.
_Avoid_: Estimated cost, final price, amount charged, actual price

### Scheduling

**Working Hours**:
The hourly start times the business offers, in Tbilisi time: 09:00 to 18:00 on the Working Days.
_Avoid_: Schedule, shifts, opening hours

**Working Days**:
The weekdays the business works, chosen by the Admin; every day of the week by default.
_Avoid_: Open days, business days

**Time Off** (არასამუშაო დრო):
A period on a specific date, from a whole day down to a few hours, when the Admin is not working despite Working Hours, such as 09:00–13:00 on 10 November 2026.
_Avoid_: Absence, blocked time, holiday, exception

**Minimum Notice** (მინიმალური წინასწარი დრო):
How many hours ahead of now a Client's chosen start time must be, set by the Admin. Zero allows booking any later hour of the same day.
_Avoid_: Lead time, cutoff, buffer

**Booking Window**:
The span of days a Client can choose from: today up to 14 days ahead.
_Avoid_: Horizon, calendar range

**Available Start Time**:
A start time a Client can pick for the Service they chose: inside Working Hours and the Booking Window, at least Minimum Notice from now, not on a Paused Day, and with the chosen Service's whole Duration clear of Time Off and of time occupied by Booked Bookings. For a Callback Request's desired start time, only the start hour itself must be clear.
_Avoid_: Slot, free time, opening
