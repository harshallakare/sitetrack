"use client";

import * as React from "react";
import { Calculator, Package, PaintBucket, Layers, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePreferences } from "@/components/providers/preferences-provider";

type Tab = "rebar" | "concrete" | "plaster" | "brick";

export function ToolsCalculators() {
  const { t } = usePreferences();
  const [tab, setTab] = React.useState<Tab>("rebar");

  const tabs: Array<{ id: Tab; label: string; icon: typeof Calculator }> = [
    { id: "rebar", label: t("tools.rebarTab"), icon: Calculator },
    { id: "concrete", label: t("tools.concreteTab"), icon: Package },
    { id: "plaster", label: t("tools.plasterTab"), icon: PaintBucket },
    { id: "brick", label: t("tools.brickTab"), icon: Layers },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" /> {tb.label}
            </button>
          );
        })}
      </div>

      {tab === "rebar" && <RebarCalculator />}
      {tab === "concrete" && <ConcreteCalculator />}
      {tab === "plaster" && <PlasterCalculator />}
      {tab === "brick" && <BrickCalculator />}
    </div>
  );
}

const REBAR_DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 32];

interface RebarRow {
  id: number;
  diameter: number;
  length: string;
  quantity: string;
}

let rowId = 0;

function RebarCalculator() {
  const { t } = usePreferences();
  const [rows, setRows] = React.useState<RebarRow[]>([{ id: rowId++, diameter: 12, length: "12", quantity: "1" }]);

  function updateRow(id: number, patch: Partial<RebarRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { id: rowId++, diameter: 12, length: "", quantity: "1" }]);
  }
  function removeRow(id: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }
  function clearAll() {
    setRows([{ id: rowId++, diameter: 12, length: "", quantity: "1" }]);
  }

  const computed = rows.map((r) => {
    const length = Number(r.length) || 0;
    const quantity = Number(r.quantity) || 0;
    const weightPerM = r.diameter * r.diameter * 0.00617;
    const weightPerBar = weightPerM * length;
    const totalWeight = weightPerBar * quantity;
    return { ...r, weightPerM, weightPerBar, totalWeight, quantity };
  });
  const totalBars = computed.reduce((s, r) => s + r.quantity, 0);
  const totalWeight = computed.reduce((s, r) => s + r.totalWeight, 0);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Calculator className="h-4 w-4" /> {t("tools.rebar.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("tools.rebar.subtitle")}</p>
        </div>
        <button onClick={clearAll} className="text-sm text-muted-foreground hover:text-foreground">
          {t("tools.clearAll")}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{t("tools.rebar.diameter")}</th>
              <th className="py-2 pr-4 font-medium">{t("tools.rebar.length")}</th>
              <th className="py-2 pr-4 font-medium">{t("tools.rebar.quantity")}</th>
              <th className="py-2 pr-4 font-medium">{t("tools.rebar.weightPerM")}</th>
              <th className="py-2 pr-4 font-medium">{t("tools.rebar.weightPerBar")}</th>
              <th className="py-2 pr-4 font-medium">{t("tools.rebar.totalWeight")}</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {computed.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="py-2 pr-4">
                  <select
                    className="h-9 rounded-md border border-border bg-transparent px-2 text-sm"
                    value={r.diameter}
                    onChange={(e) => updateRow(r.id, { diameter: Number(e.target.value) })}
                  >
                    {REBAR_DIAMETERS.map((d) => (
                      <option key={d} value={d}>
                        {d} mm
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <Input
                    type="number"
                    step="any"
                    className="h-9 w-24"
                    value={r.length}
                    onChange={(e) => updateRow(r.id, { length: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-4">
                  <Input
                    type="number"
                    step="1"
                    className="h-9 w-20"
                    value={r.quantity}
                    onChange={(e) => updateRow(r.id, { quantity: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{r.weightPerM.toFixed(2)} kg/m</td>
                <td className="py-2 pr-4 text-muted-foreground">{r.weightPerBar.toFixed(2)} kg</td>
                <td className="py-2 pr-4 font-medium">{r.totalWeight.toFixed(2)} kg</td>
                <td className="py-2">
                  <button
                    onClick={() => removeRow(r.id)}
                    disabled={rows.length === 1}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        <Plus className="h-4 w-4" /> {t("tools.rebar.addEntry")}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ResultTile label={t("tools.rebar.totalBars")} value={String(totalBars)} />
        <ResultTile label={t("tools.rebar.entries")} value={String(rows.length)} />
        <div className="col-span-2 rounded-md bg-muted p-3 sm:col-span-1">
          <div className="text-xs uppercase text-muted-foreground">{t("tools.rebar.estimatedTotal")}</div>
          <div className="text-lg font-semibold text-primary">{totalWeight.toFixed(2)} kg</div>
          <div className="text-xs text-muted-foreground">({(totalWeight / 1000).toFixed(2)} tonnes)</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t("tools.rebar.formula")}</p>
    </div>
  );
}

const CONCRETE_GRADES: Record<string, [number, number, number]> = {
  "M10 (1:3:6)": [1, 3, 6],
  "M15 (1:2:4)": [1, 2, 4],
  "M20 (1:1.5:3)": [1, 1.5, 3],
  "M25 (1:1:2)": [1, 1, 2],
};

function ConcreteCalculator() {
  const { t } = usePreferences();
  const [length, setLength] = React.useState("");
  const [width, setWidth] = React.useState("");
  const [depth, setDepth] = React.useState("");
  const [grade, setGrade] = React.useState(Object.keys(CONCRETE_GRADES)[2]);

  const l = Number(length) || 0;
  const w = Number(width) || 0;
  const d = Number(depth) || 0;
  const [cementPart, sandPart, aggPart] = CONCRETE_GRADES[grade];
  const ratioSum = cementPart + sandPart + aggPart;

  const wetVolume = l * w * d;
  const dryVolume = wetVolume * 1.54;
  const cementVolume = dryVolume * (cementPart / ratioSum);
  const cementBags = (cementVolume * 1440) / 50;
  const sandVolume = dryVolume * (sandPart / ratioSum);
  const aggregateVolume = dryVolume * (aggPart / ratioSum);

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Package className="h-4 w-4" /> {t("tools.concrete.title")}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("tools.concrete.subtitle")}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.concrete.length")}</Label>
          <Input type="number" step="any" value={length} onChange={(e) => setLength(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.concrete.width")}</Label>
          <Input type="number" step="any" value={width} onChange={(e) => setWidth(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.concrete.depth")}</Label>
          <Input type="number" step="any" value={depth} onChange={(e) => setDepth(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.concrete.grade")}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {Object.keys(CONCRETE_GRADES).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <ResultTile label={t("tools.concrete.wetVolume")} value={`${wetVolume.toFixed(2)} m³`} />
        <ResultTile label={t("tools.concrete.dryVolume")} value={`${dryVolume.toFixed(2)} m³`} />
        <ResultTile label={t("tools.concrete.cementBags")} value={cementBags.toFixed(1)} highlight />
        <ResultTile label={t("tools.concrete.sandVolume")} value={`${sandVolume.toFixed(2)} m³`} />
        <ResultTile label={t("tools.concrete.aggregateVolume")} value={`${aggregateVolume.toFixed(2)} m³`} />
      </div>
    </div>
  );
}

const PLASTER_RATIOS: Record<string, number> = { "1:4": 4, "1:6": 6 };

function PlasterCalculator() {
  const { t } = usePreferences();
  const [area, setArea] = React.useState("");
  const [thickness, setThickness] = React.useState("12");
  const [ratio, setRatio] = React.useState("1:6");

  const a = Number(area) || 0;
  const th = (Number(thickness) || 0) / 1000;
  const sandPart = PLASTER_RATIOS[ratio];
  const ratioSum = 1 + sandPart;

  const wetVolume = a * th;
  const dryVolume = wetVolume * 1.33;
  const cementVolume = dryVolume * (1 / ratioSum);
  const cementBags = (cementVolume * 1440) / 50;
  const sandVolume = dryVolume * (sandPart / ratioSum);

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <PaintBucket className="h-4 w-4" /> {t("tools.plaster.title")}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("tools.plaster.subtitle")}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.plaster.area")}</Label>
          <Input type="number" step="any" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.plaster.thickness")}</Label>
          <Input type="number" step="any" value={thickness} onChange={(e) => setThickness(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.plaster.ratio")}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
          >
            {Object.keys(PLASTER_RATIOS).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ResultTile label={t("tools.concrete.wetVolume")} value={`${wetVolume.toFixed(3)} m³`} />
        <ResultTile label={t("tools.concrete.dryVolume")} value={`${dryVolume.toFixed(3)} m³`} />
        <ResultTile label={t("tools.concrete.cementBags")} value={cementBags.toFixed(1)} highlight />
        <ResultTile label={t("tools.concrete.sandVolume")} value={`${sandVolume.toFixed(3)} m³`} />
      </div>
    </div>
  );
}

function BrickCalculator() {
  const { t } = usePreferences();
  const [wallLength, setWallLength] = React.useState("");
  const [wallHeight, setWallHeight] = React.useState("");
  const [wallThickness, setWallThickness] = React.useState("230");
  const [brickLength, setBrickLength] = React.useState("190");
  const [brickWidth, setBrickWidth] = React.useState("90");
  const [brickHeight, setBrickHeight] = React.useState("90");
  const [mortarThickness, setMortarThickness] = React.useState("10");

  const L = Number(wallLength) || 0;
  const H = Number(wallHeight) || 0;
  const T = (Number(wallThickness) || 0) / 1000;
  const bL = (Number(brickLength) || 0) / 1000;
  const bW = (Number(brickWidth) || 0) / 1000;
  const bH = (Number(brickHeight) || 0) / 1000;
  const m = (Number(mortarThickness) || 0) / 1000;

  const wallVolume = L * H * T;
  const brickWithMortarVolume = (bL + m) * (bW + m) * (bH + m);
  const numberOfBricks = brickWithMortarVolume > 0 ? Math.ceil(wallVolume / brickWithMortarVolume) : 0;
  const actualBrickVolume = bL * bW * bH;
  const mortarVolume = Math.max(0, wallVolume - numberOfBricks * actualBrickVolume);
  const cementVolume = mortarVolume * (1 / 7);
  const cementBags = (cementVolume * 1440) / 50;
  const sandVolume = mortarVolume * (6 / 7);

  return (
    <div className="rounded-lg border border-border p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Layers className="h-4 w-4" /> {t("tools.brick.title")}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("tools.brick.subtitle")}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.brick.wallLength")}</Label>
          <Input type="number" step="any" value={wallLength} onChange={(e) => setWallLength(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.brick.wallHeight")}</Label>
          <Input type="number" step="any" value={wallHeight} onChange={(e) => setWallHeight(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.brick.wallThickness")}</Label>
          <Input type="number" step="any" value={wallThickness} onChange={(e) => setWallThickness(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.brick.brickSize")} L</Label>
          <Input type="number" step="any" value={brickLength} onChange={(e) => setBrickLength(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.brick.brickSize")} W</Label>
          <Input type="number" step="any" value={brickWidth} onChange={(e) => setBrickWidth(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.brick.brickSize")} H</Label>
          <Input type="number" step="any" value={brickHeight} onChange={(e) => setBrickHeight(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("tools.brick.mortarThickness")}</Label>
          <Input type="number" step="any" value={mortarThickness} onChange={(e) => setMortarThickness(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ResultTile label={t("tools.brick.numberOfBricks")} value={String(numberOfBricks)} highlight />
        <ResultTile label={t("tools.brick.cementBags")} value={cementBags.toFixed(1)} />
        <ResultTile label={t("tools.brick.sandVolume")} value={`${sandVolume.toFixed(3)} m³`} />
      </div>
    </div>
  );
}

function ResultTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
