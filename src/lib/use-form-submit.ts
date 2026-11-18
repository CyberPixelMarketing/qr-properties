"use client";
import { startTransition, type FormEvent } from "react";

/**
 * React 19 resets uncontrolled fields after a <form action={...}> submission,
 * which wipes user input when the server returns a validation error.
 * Submitting through onSubmit + startTransition keeps the typed values.
 */
export function useFormSubmit(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}
