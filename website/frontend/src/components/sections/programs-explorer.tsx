"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { PiBookBookmarkBold } from "react-icons/pi";

export type Program = {
  id: string;
  name: string;
  institution: string;
  city: string;
  province: string;
  credential: string;
  discipline: string;
  delivery: string;
  durationMonths: number;
  startMonths: string[];
  tuition: number;
  seats: number;
  focusAreas: string[];
  highlight: string;
};

type Props = {
  programs: Program[];
};

const sortOptions = [
  { label: "Name (A-Z)", value: "name" },
  { label: "Tuition (low to high)", value: "tuition" },
  { label: "Duration", value: "duration" },
];

export function ProgramsExplorer({ programs }: Props) {
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [credentialFilter, setCredentialFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [sortBy, setSortBy] = useState(sortOptions[0].value);

  const provinceOptions = useMemo(() => {
    return Array.from(new Set(programs.map((program) => program.province))).sort();
  }, [programs]);

  const credentialOptions = useMemo(() => {
    return Array.from(new Set(programs.map((program) => program.credential))).sort();
  }, [programs]);

  const deliveryOptions = useMemo(() => {
    return Array.from(new Set(programs.map((program) => program.delivery))).sort();
  }, [programs]);

  const visiblePrograms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = programs.filter((program) => {
      if (
        provinceFilter !== "all" &&
        program.province.toLowerCase() !== provinceFilter.toLowerCase()
      ) {
        return false;
      }

      if (credentialFilter !== "all" && program.credential !== credentialFilter) {
        return false;
      }

      if (deliveryFilter !== "all" && program.delivery !== deliveryFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      return (
        program.name.toLowerCase().includes(normalizedSearch) ||
        program.institution.toLowerCase().includes(normalizedSearch) ||
        program.discipline.toLowerCase().includes(normalizedSearch) ||
        program.focusAreas.some((area) =>
          area.toLowerCase().includes(normalizedSearch),
        )
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "tuition") {
        return a.tuition - b.tuition;
      }
      if (sortBy === "duration") {
        return a.durationMonths - b.durationMonths;
      }
      return a.name.localeCompare(b.name);
    });
  }, [programs, provinceFilter, credentialFilter, deliveryFilter, search, sortBy]);

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-300 w-fit py-4 px-5 rounded-2xl shadow-sm">
      <SectionHeading
        label="Program catalog"
        title="Filter highlighted partner programs"
        description="Search by location, credential, delivery model, or specialization to build applicant cohorts."
      /> 
      </div>
      

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-2 text-sm font-medium text-slate-600 lg:col-span-2">
          Search
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Program, school, or focus"
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          Province
          <select
            value={provinceFilter}
            onChange={(event) => setProvinceFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
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
          Credential
          <select
            value={credentialFilter}
            onChange={(event) => setCredentialFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          >
            <option value="all">All credentials</option>
            {credentialOptions.map((credential) => (
              <option key={credential} value={credential}>
                {credential}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          Delivery
          <select
            value={deliveryFilter}
            onChange={(event) => setDeliveryFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
          >
            <option value="all">All modes</option>
            {deliveryOptions.map((delivery) => (
              <option key={delivery} value={delivery}>
                {delivery}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-600">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-[#c1121f] focus:outline-none"
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
        Showing <span className="font-semibold text-slate-900">{visiblePrograms.length}</span> program
        {visiblePrograms.length === 1 ? "" : "s"}
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visiblePrograms.map((program) => (
          <article
            key={program.id}
            className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>{program.discipline}</span>
                <span className="text-slate-400">{program.delivery}</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c1121f]/10 text-2xl text-[#c1121f]">
                  <PiBookBookmarkBold />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {program.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {program.institution} · {program.city}, {program.province}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{program.highlight}</p>
              <div className="flex flex-wrap gap-2">
                {program.focusAreas.map((area) => (
                  <span
                    key={`${program.id}-${area}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {area}
                  </span>
                ))}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Intakes</p>
                <p className="font-medium text-slate-900">{program.startMonths.join(", ")}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Duration</p>
                <p className="text-lg font-semibold text-slate-900">
                  {program.durationMonths} months
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tuition</p>
                <p className="text-lg font-semibold text-slate-900">
                  ${program.tuition.toLocaleString("en-CA")}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Seats</p>
                <p className="text-lg font-semibold text-slate-900">
                  {program.seats}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1">Add to cohort plan</Button>
              <Button variant="secondary" className="flex-1">
                Request info deck
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
