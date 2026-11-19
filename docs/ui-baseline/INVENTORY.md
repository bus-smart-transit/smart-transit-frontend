# Operator portal UI baseline

Screenshots of every Operator sidebar item and view, taken by `npm run e2e` (Playwright on the installed Edge) at 1280 px and 390 px. They show the portal as it was after the plain-language pass, with the Blocks crew modal. They are the "before" for any later UI change.

Taken against the local app (`npm run dev`, backend on port 8000) on the clean demo data: the database was reset on 2026-10-10 and filled by `DavaoRegionDemoSeeder` (three routes outside Davao City, three SAMPLE buses, the demo accounts), plus the one trip and the one round-trip block that `tests/e2e/operator-flows.e2e.js` schedules. Dates in the screenshots move on every run, so a later run differs in dates but not in layout. Nothing in the screenshot run changes data.

| Sidebar item | View | Address (after `/employee/operator/dashboard`) | Screenshot name |
|---|---|---|---|
| Dashboard | | `?tab=dashboard` | `dashboard` |
| Staffs | | `?tab=staffs` | `staffs` |
| Fleets | | `?tab=fleets` | `fleets` |
| Routes | | `?tab=routes` | `routes` |
| Schedule | Calendar | `?tab=schedule&view=calendar` | `schedule-calendar` |
| Schedule | Blocks | `?tab=schedule&view=blocks` | `schedule-blocks`, `schedule-blocks-modal` |
| Schedule | Trips | `?tab=schedule&view=trips` | `schedule-trips` |
| Finance | Overview | `?tab=finance&view=overview` | `finance-overview` |
| Finance | Transactions | `?tab=finance&view=transactions` | `finance-transactions` |
| Finance | Remittances | `?tab=finance&view=remittances` | `finance-remittances` |
| Finance | Refunds | `?tab=finance&view=refunds` | `finance-refunds` |
| Reports | | `?tab=reports` | `reports` |
| Account | | `?tab=account` | `account` |

Files are `screens/<name>_<width>.png`. `report.json` lists, per page and width, whether the page scrolls sideways, and any server error (500) or script error seen while taking the shots. The last run found none.

Not covered: the Driver, Chauffeur, Passenger and Admin portals in the browser, and a ticket's whole life (buy, scan, board), which needs a real payment, QR scan or phone. Steps that need a real phone or real GPS stay manual.

`tests/e2e/operator-flows.e2e.js` checks the server side without a browser: every demo account signs in, a wrong password is refused, roles cannot use each other's endpoints, the three routes have a current route line, and the Operator can schedule a one-way trip and a round-trip block while the server refuses a clash and a departure outside the bus's working hours. It picks the first free dates, so it can be run again.

To run again: start the backend and `npm run dev`, then `npm run e2e`. Set `E2E_BASE_URL`, `E2E_OPERATOR_EMAIL` and `E2E_OPERATOR_PASSWORD` to use other values.
