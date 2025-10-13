"use client";

import { useActionState } from "react";

export function useFormAction<State>(
  action: (state: State, formData: FormData) => Promise<State>,
  initialState: State,
) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    action,
    initialState,
  );

  return { state, formAction, pending };
}
