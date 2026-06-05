import type { ProfessionalMom } from "@/lib/types/transcript";
import { formatSessionDisplayDate } from "@/lib/format-session-date";

export function MomSections({
  mom,
}: {
  mom: ProfessionalMom;
}) {
  return (
    <div className="divide-y divide-white/10">
      <section className="py-6 first:pt-0">
        <h2 className="mb-3 text-[13px] font-medium text-zinc-400">Meeting metadata</h2>
        <p className="text-[14px] font-normal text-zinc-200">{mom.meetingMetadata.title}</p>
        <p className="mt-1 text-[13px] font-normal text-zinc-500">
          {formatSessionDisplayDate(mom.meetingMetadata.dateTime) ||
            mom.meetingMetadata.dateTime}
        </p>
      </section>

      <Section title="Executive summary" list={mom.executiveSummary} />
      <Section title="Key discussion points" list={mom.keyDiscussionPoints} />
      <Section
        title="Decisions made"
        list={mom.decisionsMade.map((d) => `${d.decision} (Owner: ${d.owner})`)}
      />
      <Section
        title="Action items"
        list={mom.actionItems.map((a) => `${a.task} · ${a.owner} · ${a.dueDate}`)}
      />
      <Section
        title="Risks / blockers"
        list={mom.risksBlockers.map((r) => `${r.risk} → ${r.mitigation}`)}
      />
      <Section title="Parking lot" list={mom.parkingLot} />
      <Section
        title="Next steps"
        list={mom.nextSteps.map((s) => `${s.step} · ${s.owner} · ${s.when}`)}
      />

    </div>
  );
}

function Section({ title, list }: { title: string; list: string[] }) {
  return (
    <section className="py-6">
      <h2 className="mb-3 text-[13px] font-medium text-zinc-400">{title}</h2>
      <ul className="space-y-2">
        {list.map((item, idx) => (
          <li
            key={`${title}-${idx}`}
            className="text-[14px] font-normal leading-relaxed text-zinc-200"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
