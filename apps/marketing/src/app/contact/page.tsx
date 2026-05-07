import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { SectionShell } from "@/components/ui/section-shell";

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Speak with a strategist"
        description="Share your goals and we will align you with the right pathway, partner institution, or employer track."
      />
      <SectionShell className="grid gap-12 pb-24 lg:grid-cols-[2fr_1fr]">
        <form className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-600">
              Full name
              <input
                type="text"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:border-[#c1121f] focus:outline-none"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-600">
              Email
              <input
                type="email"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:border-[#c1121f] focus:outline-none"
              />
            </label>
          </div>
          <label className="space-y-2 text-sm font-medium text-slate-600">
            Pathway of interest
            <select className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:border-[#c1121f] focus:outline-none">
              <option>Study</option>
              <option>Work Permit</option>
              <option>Permanent Residence</option>
              <option>Visit</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-600">
            Message
            <textarea
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base focus:border-[#c1121f] focus:outline-none"
              placeholder="Tell us where you are in the process"
            />
          </label>
          <Button type="submit">Request Callback</Button>
        </form>
        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-[#fff5f6] p-6 text-sm text-slate-600">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#c1121f]">
              Email
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              advisors@completecanadavisa.com
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#c1121f]">
              Office
            </p>
            <p className="mt-2">
              150 King Street W, Suite 200 <br /> Toronto, ON
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#c1121f]">
              Portal support
            </p>
            <p className="mt-2">Live chat inside the CRM portal.</p>
          </div>
        </aside>
      </SectionShell>
    </>
  );
}
