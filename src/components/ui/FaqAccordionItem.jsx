import { PlusIcon, MinusIcon } from "../Icons.jsx";

export default function FaqAccordionItem({ question, answer, open, onToggle }) {
  return (
    <div className="border-b border-slate-200 py-4 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="font-display text-base font-semibold text-navy-950">{question}</span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            open ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {open ? <MinusIcon size={15} /> : <PlusIcon size={15} />}
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <p className="overflow-hidden text-sm leading-relaxed text-slate-500">{answer}</p>
      </div>
    </div>
  );
}
