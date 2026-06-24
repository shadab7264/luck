"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { saveScoreAction } from "@/app/scores/actions";

const initialState = { ok: false, message: "" };

export function ScoreForm() {
  const [state, formAction, pending] = useActionState(saveScoreAction, initialState);

  return (
    <form className="panel formGrid" action={formAction}>
      <div className="formRow">
        <label>
          Score date
          <input name="scoreDate" type="date" required />
        </label>
        <label>
          Score
          <input name="score" type="number" min={1} max={45} required />
        </label>
      </div>
      <button className="button" type="submit" disabled={pending}>
        <Save size={17} /> {pending ? "Saving" : "Save score"}
      </button>
      {state.message ? <p className={state.ok ? "notice" : "notice warning"}>{state.message}</p> : null}
    </form>
  );
}
