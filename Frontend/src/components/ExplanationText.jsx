// A small, text-only formatter: model output never becomes raw HTML.
export default function ExplanationText({ text }) {
  return (
    <p className="whitespace-pre-line text-sm font-medium leading-relaxed tracking-wide text-neutral-200">
      {text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, index) => {
        if (/^`[^`\n]+`$/.test(part)) return <code key={index} className="break-words border border-neutral-800 bg-neutral-900 px-1 py-0.5 font-mono text-[12px] text-neutral-100">{part.slice(1, -1)}</code>
        if (/^\*\*[^*\n]+\*\*$/.test(part)) return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>
        if (/^\*[^*\n]+\*$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>
        return part
      })}
    </p>
  )
}
