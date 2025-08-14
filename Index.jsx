import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Data ---------------------------------------------------------------
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

// Convert upper-triangle symbol to its mirrored lower-triangle equivalent
// For SSIM: V ↔ A, X ↔ X, O ↔ O
const mirrorSymbol = (sym) => {
  if (!sym) return "";
  if (sym === "V") return "A";
  if (sym === "A") return "V";
  return sym; // X or O
};

// --- Tooltip (simple) ---------------------------------------------------
const Tip = ({ text, children }) => {
  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-64 -translate-x-1/2 rounded-xl border bg-white p-3 text-xs shadow-md group-hover:block">
        {text}
      </div>
    </div>
  );
};

// --- Main Component -----------------------------------------------------
export default function ISMSSIMMatrix() {
  // state holds only the upper-triangle answers: key = `${i}-${j}` with i<j
  const [answers, setAnswers] = useState(() => {
    // try load from localStorage
    try {
      const raw = localStorage.getItem("ism_ssim_answers");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("ism_ssim_answers", JSON.stringify(answers));
  }, [answers]);

  // derived helpers
  const n = wastes.length;
  const neededPairs = useMemo(() => {
    const ps = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        ps.push(`${i}-${j}`);
      }
    }
    return ps;
  }, [n]);

  const completion = useMemo(() => {
    const total = neededPairs.length;
    const filled = neededPairs.filter((k) => answers[k] && answers[k].trim() !== "").length;
    return { filled, total, pct: Math.round((filled / total) * 100) };
  }, [answers, neededPairs]);

  const setCell = (i, j, value) => {
    const key = `${i}-${j}`;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const getUpper = (i, j) => answers[`${i}-${j}`] || ""; // i<j only
  const getLower = (i, j) => mirrorSymbol(answers[`${j}-${i}`] || ""); // i>j only

  // exporting / importing
  const download = () => {
    const blob = new Blob([
      JSON.stringify({ meta: { type: "ISM-SSIM", version: 1 }, answers }, null, 2),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ism_ssim_${new Date().toISOString().slice(0,19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const fileRef = useRef(null);
  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data && data.answers && typeof data.answers === "object") {
          setAnswers(data.answers);
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        alert("Could not read JSON file.");
      }
    };
    reader.readAsText(file);
    // reset input so the same file can be uploaded again if needed
    e.target.value = "";
  };

  const clearAll = () => {
    if (confirm("Clear all answers?")) setAnswers({});
  };

  // --- UI ---------------------------------------------------------------
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
            <button onClick={download} className="rounded-2xl border px-4 py-2 shadow-sm hover:shadow">
              Export JSON
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-2xl border px-4 py-2 shadow-sm hover:shadow">
              Import JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json" onChange={onUpload} className="hidden" />
            <button onClick={clearAll} className="rounded-2xl border px-4 py-2 shadow-sm hover:shadow">
              Clear
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
                      // diagonal
                      if (i === j) {
                        return (
                          <td key={j} className="p-2 text-center text-gray-400">—</td>
                        );
                      }
                      // upper triangle: input
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
                      // lower triangle: derived, read-only
                      const mirrored = getLower(i, j);
                      return (
                        <td key={j} className="p-2 text-center text-gray-700">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-gray-50 text-sm">
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

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Items & Descriptions</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {wastes.map((w) => (
              <div key={w.code} className="rounded-xl border p-3 text-sm">
                <div className="font-semibold">{w.code}</div>
                <div className="text-gray-700">{w.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-gray-500">
          Upper triangle is editable; lower triangle is auto-derived (V↔A; X,X; O,O). Answers auto-save to your browser.
        </footer>
      </div>
    </div>
  );
}
