import { useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import SearchBar from "../../components/ui/SearchBar.jsx";
import FilterTabs from "../../components/ui/FilterTabs.jsx";
import { TRIP_HISTORY } from "../../data/sampleData.js";

const FILTERS = ["All", "Completed", "Cancelled"];

export default function TripHistoryPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredTrips = useMemo(() => {
    return TRIP_HISTORY.filter((trip) => {
      const matchesFilter = filter === "All" || trip.tripStatus === filter;
      const matchesQuery =
        query.trim() === "" ||
        trip.route.toLowerCase().includes(query.toLowerCase()) ||
        trip.operator.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [query, filter]);

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
              Trip History
            </h1>
            <p className="mt-1 text-sm text-slate-500">{TRIP_HISTORY.length} past trips</p>
          </div>
          <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search by route or bus operator..."
          className="mt-4 max-w-md"
        />

        {filteredTrips.length === 0 && (
          <Card className="mt-6 p-8 text-center text-sm text-slate-500">
            No trips match your search.
          </Card>
        )}

        {/* Desktop table */}
        <Card className="mt-6 hidden overflow-hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Bus Operator</th>
                <th className="px-5 py-3">Seat</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Fare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.map((trip) => (
                <tr key={trip.id}>
                  <td className="px-5 py-3.5 text-slate-500">{trip.date}</td>
                  <td className="px-5 py-3.5 font-medium text-navy-950">{trip.route}</td>
                  <td className="px-5 py-3.5 text-slate-500">{trip.operator}</td>
                  <td className="px-5 py-3.5 text-slate-500">Seat {trip.seat}</td>
                  <td className="px-5 py-3.5 text-slate-500">{trip.paymentStatus}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={trip.tripStatus} />
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-navy-950">₱{trip.fare.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Mobile cards */}
        <div className="mt-6 space-y-3 md:hidden">
          {filteredTrips.map((trip) => (
            <Card key={trip.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-navy-950">{trip.route}</p>
                  <p className="text-xs text-slate-400">{trip.date}</p>
                </div>
                <StatusBadge status={trip.tripStatus} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs text-slate-500">
                <span>Operator: {trip.operator}</span>
                <span>Seat {trip.seat}</span>
                <span>{trip.paymentStatus} · {trip.paymentMethod}</span>
                <span className="text-right font-semibold text-navy-950">₱{trip.fare.toFixed(2)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
