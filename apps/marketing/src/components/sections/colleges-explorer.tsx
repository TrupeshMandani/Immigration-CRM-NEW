"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { HiAcademicCap } from "react-icons/hi";

export type College = {
  id: string;
  name: string;
  city: string;
  province: string;
  type: string;
  tier: string;
  focusAreas: string[];
  avgTuition: number;
  intlSeats: number;
  programsOffered: number;
  partnerSince: string;
  highlight: string;
};

type Props = {
  colleges: College[];
};

const sortOptions = [
  { label: "Name (A-Z)", value: "name" },
  { label: "Tuition (low to high)", value: "tuition" },
  { label: "International seats", value: "seats" },
];

export function CollegesExplorer({ colleges }: Props) {
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState(sortOptions[0].value);

  const provinceOptions = useMemo(() => {
    const values = Array.from(new Set(colleges.map((college) => college.province)));
    return values.sort();
  }, [colleges]);

  const typeOptions = useMemo(() => {
    const values = Array.from(new Set(colleges.map((college) => college.type)));
    return values.sort();
  }, [colleges]);

  const visibleColleges = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = colleges.filter((college) => {
      if (
        provinceFilter !== "all" &&
        college.province.toLowerCase() !== provinceFilter.toLowerCase()
      ) {
        return false;
      }

      if (typeFilter !== "all" && college.type !== typeFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      return (
        college.name.toLowerCase().includes(normalizedSearch) ||
        college.focusAreas.some((area) =>
          area.toLowerCase().includes(normalizedSearch),
        ) ||
        college.city.toLowerCase().includes(normalizedSearch)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "tuition") {
        return a.avgTuition - b.avgTuition;
      }
      if (sortBy === "seats") {
        return b.intlSeats - a.intlSeats;
      }
      return a.name.localeCompare(b.name);
    });
  }, [colleges, provinceFilter, typeFilter, search, sortBy]);

  return (
    <div className="space-y-8">
       <div className="bg-white border border-slate-300 py-5 w-fit rounded-3xl px-5">
        <SectionHeading
        label="Partner network"
        title="Explore highlighted colleges"
        description="Filter by province, institution type, or focus area to build your intake plan."
        />
       </div>

      <div className="grid gap-4 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-sm font-medium text-slate-600">
          Search
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Institution or focus area"
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          Province
          <select
            value={provinceFilter}
            onChange={(event) => setProvinceFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          >
            <option value="all">All provinces</option>
            {provinceOptions.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          Institution type
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          >
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-slate-500 bg-white py-3 px-5 w-fit rounded-2xl border border-slate-300">
        Showing <span className="font-semibold text-slate-900">{visibleColleges.length}</span> partner
        {visibleColleges.length === 1 ? " institution" : " institutions"}
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleColleges.map((college) => (
          <article
            key={college.id}
            className="flex h-full flex-col justify-between rounded-3xl border border-slate-300 bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>{college.type}</span>
                <span className="text-slate-400">Partner since {college.partnerSince}</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c1121f]/10 text-2xl text-[#c1121f]">
                  <HiAcademicCap />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{college.name}</h3>
                  <p className="text-sm text-slate-500">
                    {college.city}, {college.province} · {college.tier}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{college.highlight}</p>
              <div className="flex flex-wrap gap-2">
                {college.focusAreas.map((area) => (
                  <span
                    key={`${college.id}-${area}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 grid gap-6 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Programs</p>
                <p className="text-lg font-semibold text-slate-900">
                  {college.programsOffered}+
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Avg tuition</p>
                <p className="text-lg font-semibold text-slate-900">
                  ${""}
                  {college.avgTuition.toLocaleString("en-CA")}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Intl seats</p>
                <p className="text-lg font-semibold text-slate-900">
                  {college.intlSeats.toLocaleString("en-CA")}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1">Add to intake plan</Button>
              <Button variant="secondary" className="flex-1">
                Request showcase slot
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
