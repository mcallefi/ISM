import React, { useMemo, useState } from "react";

// O endpoint da API que o Vercel irá criar
const SAVE_ENDPOINT = "/api/save";

const wastes = [
  { code: "D1", desc: "Purchasing large quantities of products with low inventory turnover" },
  { code: "D2", desc: "Accumulating high volumes of expired inventory" },
  { code: "D3", desc: "Insufficiently located docks, far from the areas where products are ultimately stored" },
  { code: "D4", desc: "Lack of products in designated areas" },
  { code: "D5", desc: "Excessive reliance on manual processes within operations" },
  { code: "D6", desc: "Frequent bucket congestion on conveyor systems" },
  { code: "D7", desc: "Errors in the final verification of order volumes" },
  { code: "D8", desc: "Significant amounts of damaged inventory" },
  { code: "D9", desc: "Manual pallet assembly" },
  { code: "D10", desc: "Lack of tracking for shipped merchandise" },
];

const SCALE = [
  { value: "V", label: "V — i influences j" },
  { value: "A", label: "A — j influences i" },
  { value: "X", label: "X — mutual influence" },
  { value: "O", label: "O — no relation" },
];

const mirrorSymbol = (sym) => {
  if (!sym) return "";
  if (sym === "V") return "A";
  if (sym === "A") return "V";
  return sym;
};

const buildNeededPairs = (n) => {
  const ps = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) ps.push(`${i}-${j}`);
  }
  return ps;
};

const computeCompletion = (answers, neededPairs) => {
  const total = neededPairs.length;
  const filled = neededPairs.filter((k) => answers[k] && String(answers[k]).trim() !== "").length;
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
};

const Tip = ({ text, children }) => (
  <div className="relative group inline-flex items-center">
    {children}
    <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-64 -translate-x-1/2 rounded-xl border bg-white p-3 text-xs shadow-md group-hover:block">
      {text}
    </div>
  </div>
);

export default function ISMSSIMMatrix() {
  const [answers, setAnswers] = useState({});
  const n = wastes.length;
  const neededPairs = useMemo(() => buildNeededPairs(n), [n]);
  const completion = useMemo(() => computeCompletion(answers, neededPairs), [answers, neededPairs]);

  const getUpper = (i, j) => answers[`${i}-${j}`] || "";
  const getLower = (i, j) => mirrorSymbol(answers[`${j}-${i}`] || "");
  const setCell = (i, j, value) => setAnswers((prev) => ({ ...prev, [`${i}-${j}`]: value }));

  const saveIfComplete = async () => {
    if (completion.filled < completion.total) {
      alert("Please complete the matrix before saving.");
      return;
    }
    const payload = {
      meta: { type: "ISM-SSIM", version: 1, created_at: new Date().toISOString() },
      answers,
    };
    try {
      await fetch(SAVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setAnswers({});
      alert("Response saved to GitHub successfully!");
    } catch (e) {
      console.error(e);
      alert("Could not save to GitHub. Check the server logs.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">ISM – SSIM Matrix Filler</h1>
            <p className="text-sm text-gray-600">
              Fill <span className="font-semibold">only the upper triangle</span> using the standard ISM scale.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveIfComplete}
              disabled={completion.filled < completion.total}
              className="rounded-2xl border px-4 py-2 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              title={completion.filled < completion.total ? `Complete ${completion.filled}/${completion.total} to enable save` : "Save"}
            >
              Save
            </button>
          </div>
        </header>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Scale (SSIM)</h2>
          <ul className="text-sm text-gray-700 list-disc pl-5">
            <li><strong>V</strong>: Row element <em>(i)</em> influences Column element <em>(j)</em>.</li>
            <li><strong>A</strong>: Column element <em>(j)</em> influences Row element <em>(i)</em>.</li>
            <li><strong>X</strong>: Mutual influence between <em>i</em> and <em>j</em>.</li>
            <li><strong>O</strong>: No relation between <em>i</em> and <em>j</em>.</li>
          </ul>
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">SSIM Matrix</h2>
            <div className="text-sm text-gray-600">Completion: <span className="font-semibold">{completion.filled}/{completion.total}</span> ({completion.pct}%)</div>
          </div>

          <div className="overflow-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-10 bg-gray-100 p-2 text-left">Row ↓ / Col →</th>
                  {wastes.map((w) => (
                    <th key={w.code} className="bg-gray-100 p-2 text-center align-bottom">
                      <Tip text={w.desc}><span className="cursor-help font-semibold">{w.code}</span></Tip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wastes.map((row, i) => (
                  <tr key={row.code} className="border-t">
                    <th className="sticky left-0 bg-gray-100 p-2 text-left align-middle">
                      <Tip text={row.desc}><span className="cursor-help font-semibold">{row.code}</span></Tip>
                    </th>
                    {wastes.map((col, j) => {
                      if (i === j) return <td key={j} className="p-2 text-center text-gray-400">—</td>;
                      if (i < j) {
                        const key = `${i}-${j}`;
                        const val = getUpper(i, j);
                        return (
                          <td key={j} className="p-1 text-center">
                            <select
                              aria-label={`SSIM for ${row.code} vs ${col.code}`}
                              className="w-20 rounded-xl border px-2 py-1 text-sm"
                              value={val}
                              onChange={(e) => setCell(i, j, e.target.value)}
                            >
                              <option value="">(select)</option>
                              {SCALE.map((s) => (
                                <option key={s.value} value={s.value}>{s.value}</option>
                              ))}
                            </select>
                          </td>
                        );
                      }
                      const mirrored = getLower(i, j);
                      return (
                        <td key={j} className="p-2 text-center text-gray-700">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-gray-50 text-sm" title={wastes[i].desc + ' vs ' + wastes[j].desc}>
                            {mirrored || ""}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}