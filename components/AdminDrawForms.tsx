"use client";

import { useActionState } from "react";
import { Play, Send } from "lucide-react";
import { publishDrawAction, runDrawSimulationAction } from "@/app/admin/actions";

const initialState = { ok: false, message: "" };

export function DrawSimulationForm() {
  const [state, formAction, pending] = useActionState(runDrawSimulationAction, initialState);

  return (
    <form className="card" action={formAction}>
      <strong>Simulation</strong>
      <label>
        Draw month
        <input name="drawMonth" type="date" required />
      </label>
      <label>
        Draw type
        <select name="drawType" defaultValue="random">
          <option value="random">Random</option>
          <option value="algorithmic">Algorithmic</option>
        </select>
      </label>
      <label>
        Algorithmic weighting
        <select name="algorithmicMode" defaultValue="most_frequent">
          <option value="most_frequent">Most frequent</option>
          <option value="least_frequent">Least frequent</option>
        </select>
      </label>
      <button className="button" type="submit" disabled={pending}>
        <Play size={17} /> {pending ? "Running" : "Run simulation"}
      </button>
      {state.message ? <p className={state.ok ? "notice" : "notice warning"}>{state.message}</p> : null}
    </form>
  );
}

export function PublishDrawForm({ draws }: { draws: Array<{ id: string; label: string }> }) {
  const [state, formAction, pending] = useActionState(publishDrawAction, initialState);

  return (
    <form className="card" action={formAction}>
      <strong>Publish draw</strong>
      <label>
        Draft or simulated draw
        <select name="drawId" required>
          {draws.map((draw) => (
            <option key={draw.id} value={draw.id}>
              {draw.label}
            </option>
          ))}
        </select>
      </label>
      <button className="button" type="submit" disabled={pending || draws.length === 0}>
        <Send size={17} /> {pending ? "Publishing" : "Publish"}
      </button>
      {state.message ? <p className={state.ok ? "notice" : "notice warning"}>{state.message}</p> : null}
    </form>
  );
}
